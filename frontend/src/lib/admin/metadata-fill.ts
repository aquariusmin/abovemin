import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudinaryConfig } from '@/lib/cloudinary-upload';
import { publicIdFromUrl } from '@/lib/cloudinary';
import { cleanCaptionField } from '@/lib/caption';
import { isMissingColumnError, isMissingSchemaError } from '@/lib/db-compat';
import { log } from '@/lib/logger';
import { hasExif, normalizeResource, placeFromCoords, type RoundedCoord } from './photo-metadata';

// 서버 전용. Admin API는 시간당 약 500회라 이미 시도한 사진(exif_checked_at)은 다시 묻지 않는다.

export const METADATA_BATCH = 20;

const CONCURRENCY = 4;

// 이 아래로 내려가면 멈춘다 — 원본 정리 스캔 몫을 남겨 둔다.
const RATE_LIMIT_FLOOR = 20;

export interface FillResult {
  processed: number;
  withExif: number;
  placesAdded: Array<{ name: string } & RoundedCoord>;
  rateLimited: boolean;
  placesMigrationPending: boolean;
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
  // 다시 물어도 같다.
  | { kind: 'gone' }
  // 표시하지 않고 다음에 다시 시도한다.
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

// deadline이 지나면 새 요청을 시작하지 않는다 — 받아 놓고 못 쓰는 호출을 만들지 않으려고.
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
  // gps_in_original 컬럼이 없으면(마이그레이션 전) 나머지는 플래그 없이 쓴다.
  let flagColumn = true;
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

// 좌표 행이 없는 장소에만 넣는다 — 사람이 고친 값이 이긴다(on conflict do nothing).
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

export async function metadataProgress(
  db: SupabaseClient,
): Promise<{ ok: true; total: number; remaining: number } | { ok: false; migration: boolean; error: unknown }> {
  // head: true를 쓰지 않는다: HEAD 응답으로는 마이그레이션 전인지 알아볼 수 없다.
  const [total, remaining] = await Promise.all([
    db.from('photos').select('id', { count: 'exact' }).limit(1),
    db.from('photos').select('id', { count: 'exact' }).is('exif_checked_at', null).limit(1),
  ]);
  const error = total.error ?? remaining.error;
  if (error) return { ok: false, migration: isMissingSchemaError(error), error };
  return { ok: true, total: total.count ?? 0, remaining: remaining.count ?? 0 };
}
