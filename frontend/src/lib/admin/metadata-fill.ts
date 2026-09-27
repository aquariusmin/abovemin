import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudinaryConfig } from '@/lib/cloudinary-upload';
import { publicIdFromUrl } from '@/lib/cloudinary';
import { cleanCaptionField } from '@/lib/caption';
import { isMissingColumnError, isMissingSchemaError } from '@/lib/db-compat';
import { log } from '@/lib/logger';
import { hasExif, normalizeResource, placeFromCoords, type RoundedCoord } from './photo-metadata';

/**
 * 촬영 정보 채우기 — Cloudinary Admin API에서 EXIF를 읽어 `photos`에 적고,
 * 장소마다 대표 좌표를 `places`에 넣는다. **서버 전용.**
 *
 * 한 번에 몇 장씩만 한다. 호출하는 쪽이 둘이다:
 *  - 관리 화면의 "촬영 정보 채우기" 버튼 → `api/admin/photos/metadata` POST를
 *    남은 것이 없을 때까지 되풀이한다(20장씩).
 *  - 새 사진 저장(`api/admin/photos` POST) → 응답을 보낸 **뒤에**(`after`)
 *    방금 넣은 id만.
 *
 * 같은 호출로 **원본에 위치 정보가 남았는지**도 본다(`photos.gps_in_original`).
 * 업로드 화면과 CLI는 올리기 전에 지우므로 새 사진은 false여야 한다. true면
 * 다른 경로로 올라온 원본이라 경고를 남기고 개요의 데이터 점검에 띄운다 —
 * 원본을 자동으로 고치거나 지우지는 않는다.
 *
 * Admin API는 이 요금제에서 시간당 약 500회다. 293장을 한 번 훑는 데 293회가
 * 들므로, 이미 시도한 사진(`exif_checked_at`)은 다시 묻지 않고, 남은 호출 수가
 * 바닥에 가까우면 멈춘다.
 */

/** 버튼 한 번(요청 한 번)에 처리하는 최대 장수. */
export const METADATA_BATCH = 20;

/** 동시에 여는 Admin API 요청 수. */
const CONCURRENCY = 4;

/** 남은 호출 수가 이 아래로 내려가면 멈춘다 — 원본 정리 스캔 몫을 남겨 둔다. */
const RATE_LIMIT_FLOOR = 20;

export interface FillResult {
  processed: number;
  /** EXIF가 하나라도 있었던 장수. */
  withExif: number;
  /** 이번에 새로 넣은 장소 좌표(소수점 한 자리). */
  placesAdded: Array<{ name: string } & RoundedCoord>;
  /** Cloudinary가 호출 제한에 걸렸거나 가까워서 멈췄다. */
  rateLimited: boolean;
  /** `places` 테이블이 없어 좌표는 건너뛰었다. */
  placesMigrationPending: boolean;
  /** 원본에 위치 정보가 남아 있던 장수. */
  locationInOriginal: number;
}

export type FillOutcome = { ok: true; result: FillResult } | { ok: false; migration: boolean; error: unknown };

interface PhotoRow {
  id: number;
  src: string;
  location: string | null;
}

type Fetched =
  | { kind: 'ok'; resource: Record<string, unknown>; remaining: number | null }
  /** 자산이 없거나 URL에서 public_id를 못 꺼냈다 — 다시 물어도 같다. */
  | { kind: 'gone' }
  /** 호출 제한 또는 일시적 오류 — 표시하지 않고 다음에 다시 시도한다. */
  | { kind: 'retry'; rateLimited: boolean };

async function fetchResource(config: CloudinaryConfig, src: string): Promise<Fetched> {
  const publicId = publicIdFromUrl(src);
  if (!publicId) return { kind: 'gone' };
  const endpoint =
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/` +
    `${publicId.split('/').map(encodeURIComponent).join('/')}?image_metadata=true`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const remainingHeader = res.headers.get('x-featureratelimit-remaining');
    const remaining = remainingHeader === null ? null : Number(remainingHeader);
    if (res.status === 404) return { kind: 'gone' };
    // Cloudinary는 호출 제한을 420으로 알린다(429도 대비).
    if (res.status === 420 || res.status === 429) return { kind: 'retry', rateLimited: true };
    if (!res.ok) {
      log.warn('metadata_fill_cloudinary_http', { status: res.status, publicId });
      return { kind: 'retry', rateLimited: false };
    }
    return { kind: 'ok', resource: (await res.json()) as Record<string, unknown>, remaining };
  } catch (error) {
    log.warn('metadata_fill_cloudinary_fetch', { publicId, error: String(error) });
    return { kind: 'retry', rateLimited: false };
  }
}

/**
 * 아직 시도하지 않은 사진 중 `limit`장(또는 `ids`로 좁힌 것)을 채운다.
 *
 * `deadline`(ms, epoch)이 지나면 새 요청을 시작하지 않는다 — 이미 받은 것까지
 * 저장하고 끝낸다. 함수 실행 시간 상한에 걸려 **받아 놓고 못 쓰는** 호출을
 * 만들지 않으려고.
 *
 * `recheck`는 `ids`와 함께만 뜻이 있다: 이미 시도한 사진도 다시 묻는다. 개요의
 * "위치 정보가 남은 원본"에서 원본을 고친 뒤 표시를 갱신하는 데 쓴다.
 */
export async function fillPhotoMetadata(
  db: SupabaseClient,
  config: CloudinaryConfig,
  {
    limit = METADATA_BATCH,
    ids,
    deadline,
    recheck = false,
  }: { limit?: number; ids?: number[]; deadline?: number; recheck?: boolean } = {},
): Promise<FillOutcome> {
  let query = db.from('photos').select('id, src, location').order('id').limit(limit);
  if (!(recheck && ids)) query = query.is('exif_checked_at', null);
  if (ids) query = query.in('id', ids);
  const { data, error } = await query;
  if (error) return { ok: false, migration: isMissingSchemaError(error), error };

  const rows = (data ?? []) as PhotoRow[];
  const result: FillResult = {
    processed: 0,
    withExif: 0,
    placesAdded: [],
    rateLimited: false,
    placesMigrationPending: false,
    locationInOriginal: 0,
  };
  // `gps_in_original` 컬럼이 있는지는 첫 update가 알려 준다. 없으면(업로드
  // 프라이버시 마이그레이션 전) 나머지는 플래그 없이 쓴다.
  let flagColumn = true;
  // 장소 이름 → 이번 배치에서 모인 (이미 반올림된) 좌표. 메모리에만 있고
  // 요청이 끝나면 사라진다.
  const coordsByPlace = new Map<string, RoundedCoord[]>();

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    if (result.rateLimited || (deadline && Date.now() > deadline)) break;
    const chunk = rows.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(chunk.map(row => fetchResource(config, row.src)));

    for (const [j, outcome] of fetched.entries()) {
      const row = chunk[j];
      if (outcome.kind === 'retry') {
        if (outcome.rateLimited) result.rateLimited = true;
        continue;
      }
      if (outcome.kind === 'ok' && outcome.remaining !== null && outcome.remaining < RATE_LIMIT_FLOOR) {
        result.rateLimited = true;
      }

      const normalized = outcome.kind === 'ok' ? normalizeResource(outcome.resource) : null;
      // EXIF가 없어도 시도했다는 표시는 남긴다 — 그래야 다음 배치가 넘어간다.
      const update = { ...(normalized?.fields ?? {}), exif_checked_at: new Date().toISOString() };
      // 자산을 못 찾은 사진(`gone`)은 원본을 본 것이 아니므로 플래그를 비워 둔다.
      const withFlag = normalized && flagColumn ? { ...update, gps_in_original: normalized.hasLocation } : null;
      let { error: updateError } = await db.from('photos').update(withFlag ?? update).eq('id', row.id);
      if (updateError && withFlag && isMissingColumnError(updateError)) {
        flagColumn = false;
        ({ error: updateError } = await db.from('photos').update(update).eq('id', row.id));
      }
      if (updateError) return { ok: false, migration: isMissingSchemaError(updateError), error: updateError };

      if (normalized?.hasLocation) {
        result.locationInOriginal += 1;
        // 좌표는 남기지 않는다 — 어느 사진인지만.
        log.warn('metadata_fill_location_in_original', { id: row.id });
      }
      result.processed += 1;
      if (normalized && hasExif(normalized.fields)) {
        result.withExif += 1;
      }
      const place = cleanCaptionField(row.location);
      if (normalized?.gps && place) {
        coordsByPlace.set(place, [...(coordsByPlace.get(place) ?? []), normalized.gps]);
      }
    }
  }

  if (coordsByPlace.size > 0) {
    const places = await addMissingPlaces(db, coordsByPlace);
    result.placesAdded = places.added;
    result.placesMigrationPending = places.migration;
  }

  log.info('metadata_fill_batch', {
    processed: result.processed,
    withExif: result.withExif,
    placesAdded: result.placesAdded.length,
    locationInOriginal: result.locationInOriginal,
    rateLimited: result.rateLimited,
  });
  return { ok: true, result };
}

/**
 * 좌표 행이 **없는** 장소에만 중앙값을 넣는다. 이미 있는 행은 건드리지 않는다
 * — 사람이 고친 값이 이긴다. `ignoreDuplicates`(= on conflict do nothing)라
 * 확인과 삽입 사이에 누가 행을 만들어도 덮어쓰지 않는다.
 *
 * 부르는 곳이 둘이다: 이 파일의 채우기(Cloudinary EXIF에서 읽은 좌표)와 새 사진
 * 저장(`api/admin/photos` POST — 업로드 화면이 위치를 지우기 **전에** 브라우저에서
 * 읽어 반올림해 보낸 좌표). 원본에서 GPS를 지우고 나면 앞의 경로에는 좌표가
 * 없으므로, 새 사진의 장소 좌표는 뒤의 경로가 만든다.
 *
 * 한계: 배치마다 따로 계산하므로, 한 장소의 좌표는 그 장소가 처음 등장한
 * 배치의 사진들로 정해진다. 11km 격자에서는 스무 장의 중앙값으로 충분하고,
 * 틀리면 관리 화면의 "장소 좌표"에서 고친다.
 */
export async function addMissingPlaces(
  db: SupabaseClient,
  coordsByPlace: Map<string, RoundedCoord[]>,
): Promise<{ added: FillResult['placesAdded']; migration: boolean }> {
  const names = [...coordsByPlace.keys()];
  if (names.length === 0) return { added: [], migration: false };
  const { data: existing, error } = await db.from('places').select('name').in('name', names);
  if (error) {
    if (isMissingSchemaError(error)) return { added: [], migration: true };
    log.warn('metadata_fill_places_read', error);
    return { added: [], migration: false };
  }
  const known = new Set((existing ?? []).map(row => row.name as string));
  const rows = names
    .filter(name => !known.has(name))
    .map(name => ({ name, coord: placeFromCoords(coordsByPlace.get(name) ?? []) }))
    .filter((row): row is { name: string; coord: RoundedCoord } => row.coord !== null)
    .map(({ name, coord }) => ({ name, lat: coord.lat, lng: coord.lng, source: 'gps' }));
  if (rows.length === 0) return { added: [], migration: false };

  const { data: inserted, error: insertError } = await db
    .from('places')
    .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
    .select('name, lat, lng');
  if (insertError) {
    if (isMissingSchemaError(insertError)) return { added: [], migration: true };
    log.warn('metadata_fill_places_insert', insertError);
    return { added: [], migration: false };
  }
  return {
    added: (inserted ?? []).map(row => ({ name: row.name as string, lat: Number(row.lat), lng: Number(row.lng) })),
    migration: false,
  };
}

/** 전체 장수와 아직 시도하지 않은 장수. */
export async function metadataProgress(
  db: SupabaseClient,
): Promise<{ ok: true; total: number; remaining: number } | { ok: false; migration: boolean; error: unknown }> {
  // `head: true`를 쓰지 않는다. HEAD 응답에는 본문이 없어서, 컬럼이 없을 때의
  // 400은 코드 없는 빈 오류가 되고 테이블이 없을 때의 404는 **오류 없이** 0건이
  // 된다(postgrest-js) — 마이그레이션 전인지 알아볼 수가 없다. 한 행만 받는다.
  const [total, remaining] = await Promise.all([
    db.from('photos').select('id', { count: 'exact' }).limit(1),
    db.from('photos').select('id', { count: 'exact' }).is('exif_checked_at', null).limit(1),
  ]);
  const error = total.error ?? remaining.error;
  if (error) return { ok: false, migration: isMissingSchemaError(error), error };
  return { ok: true, total: total.count ?? 0, remaining: remaining.count ?? 0 };
}
