import { NextResponse, after } from 'next/server';
import { getCloudinaryConfig, isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/cache-tags';
import { PHOTO_COLUMN_LEVEL, photoColumnSets, selectWithColumnSets } from '@/lib/admin/photo-columns';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';
import { addMissingPlaces, fillPhotoMetadata } from '@/lib/admin/metadata-fill';
import { groupCoordsByPlace } from '@/lib/admin/photo-metadata';
import {
  ALBUM_SLUG_RE,
  PhotoCreate,
  PhotoDelete,
  PhotoUpdate,
  firstIssue,
  photoCreateItem,
  type PhotoCreateItemInput,
} from '@/lib/admin/schemas';
import { cleanCaptionField } from '@/lib/caption';

// 저장 뒤 촬영 정보 채우기(`after`)가 이 함수의 시간 안에서 돈다.
export const maxDuration = 30;

// ── 목록 ──────────────────────────────────────────────────────────────────────

/**
 * 목록이 읽는 컬럼. 크기·촬영일·카메라·위치 플래그까지 읽어, 아카이브 탭의
 * 점검 필터(연도 불일치·저해상도·촬영 정보 없음·위치가 남은 원본)가 개요와 같은
 * 규칙(`lib/admin/data-checks.ts`)으로 거른다.
 */
const LIST_COLUMN_SETS = photoColumnSets('id, album_slug, src, title, location, year, sort_order');

/**
 * 사진 목록. 두 가지로 부른다.
 *  - `?album=<slug>`: 한 앨범의 사진 전부. 정보 수정·순서·일괄 작업 화면.
 *  - `?scope=all`: 아카이브 전체. 히어로 이미지 고르기처럼 앨범을 가로지르는 곳.
 *
 * 숨긴 사진도 **포함한다** — 관리 화면은 숨긴 것을 다시 보이게 하는 곳이다.
 * 마이그레이션 전에는 없는 컬럼을 빼고 읽는다. `migrationPending`은 `hidden`/
 * `created_at`까지 없을 때(admin-studio 전)만 켠다 — 화면의 안내가 그 기능이다.
 */
export async function GET(request: Request) {
  const denied = await guardRead();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const albumSlug = params.get('album');
  const all = params.get('scope') === 'all';
  if (!all && (!albumSlug || !ALBUM_SLUG_RE.test(albumSlug))) {
    return jsonError('Invalid album', 400);
  }

  const db = adminDb('admin_photos');
  if (!db.ok) return db.response;

  const query = (columns: string) => {
    const base = db.value.from('photos').select(columns);
    return all
      ? base.order('album_slug').order('sort_order')
      : base.eq('album_slug', albumSlug!).order('sort_order');
  };
  const { data, error, level } = await selectWithColumnSets('admin_photos_list', LIST_COLUMN_SETS, query);
  const migrationPending = level >= PHOTO_COLUMN_LEVEL.legacy;

  if (error) return dbErrorResponse('admin_photos_list', error);
  return NextResponse.json({ photos: data ?? [], migrationPending });
}

// ── 추가 ──────────────────────────────────────────────────────────────────────

/**
 * 업로드가 끝난 사진들을 `photos`에 한 번에 넣는다.
 *
 * 파일 자체는 이미 브라우저 → Cloudinary로 직접 올라간 뒤이고, 여기로 오는 건
 * 그 결과 URL과 메타데이터뿐이다.
 */
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoCreate);
  if (!body.ok) return body.response;
  const albumSlug = body.value.album_slug;

  let cloudName: string;
  try {
    cloudName = getCloudinaryConfig().cloudName;
  } catch (error) {
    log.error('admin_photos_cloudinary', error);
    return jsonError('Cloudinary upload is not configured', 503);
  }

  // 사진은 하나씩 본다 — 몇 번째가 틀렸는지 화면에 알려야 하고, `src` 확인에는
  // 위에서 읽은 클라우드 이름이 든다(`photoCreateItem`). 좌표는 브라우저가 이미
  // 반올림했더라도 스키마가 다시 자르고, 틀리면 좌표만 버린다.
  const PhotoItem = photoCreateItem(src => isOwnCloudinaryUrl(src, cloudName));
  const photos: PhotoCreateItemInput[] = [];
  for (const [i, raw] of body.value.photos.entries()) {
    const parsed = PhotoItem.safeParse(raw);
    if (!parsed.success) return jsonError(`${i + 1}번째 사진: ${firstIssue(parsed.error)}`, 400);
    photos.push(parsed.data);
  }

  const db = adminDb('admin_photos');
  if (!db.ok) return db.response;
  const supabase = db.value;

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('slug')
    .eq('slug', albumSlug)
    .single();
  if (albumError || !album) return jsonError('Album not found', 404);

  // 새 사진은 앨범 끝에 붙인다. 관리자 한 명이 쓰는 화면이라 동시 삽입 경합은
  // 고려하지 않는다 — 겹치더라도 정렬 순서만 흔들리고 데이터는 남는다.
  const { data: last, error: orderError } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('album_slug', albumSlug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return dbErrorResponse('admin_photos_sort_order', orderError);
  const startOrder = (last?.sort_order ?? 0) + 1;

  const rows = photos.map((photo, i) => ({
    album_slug: albumSlug,
    src: photo.src,
    title: photo.title,
    location: photo.location,
    year: photo.year,
    sort_order: startOrder + i,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('photos')
    .insert(rows)
    .select('id');
  if (insertError) return dbErrorResponse('admin_photos_insert', insertError);

  // 좌표가 없는 장소에만 이번 사진들의 중앙값을 넣는다(`addMissingPlaces` — 이미
  // 있는 행은 덮어쓰지 않는다). 실패해도 사진은 이미 저장됐으므로 응답은 성공이다.
  // `places`가 없으면(archive-extras 마이그레이션 전) 조용히 건너뛴다.
  const coordsByPlace = groupCoordsByPlace(
    photos.map(photo => ({ place: cleanCaptionField(photo.location), coord: photo.place_coord })),
  );
  let placesAdded = 0;
  if (coordsByPlace.size > 0) {
    try {
      placesAdded = (await addMissingPlaces(supabase, coordsByPlace)).added.length;
    } catch (error) {
      log.warn('admin_photos_places', String(error));
    }
  }

  revalidateArchive();

  // 방금 넣은 사진의 촬영 정보를 **응답을 보낸 뒤에** 채운다(`after`). 저장은
  // 이미 끝났으므로, 여기서 무엇이 실패해도 저장 결과는 바뀌지 않는다 — 실패한
  // 사진은 `exif_checked_at`이 비어 남고, 설정 탭의 "촬영 정보 채우기"가 나중에
  // 가져간다. 마이그레이션 전이면 조회가 42703으로 끝나고 조용히 지나간다.
  //
  // 함수 시간 상한(Hobby 기본 수십 초)을 넘지 않도록 새 요청은 15초에서 멈춘다.
  // 한 번에 최대 60장이라 보통은 그 안에 끝나고, 못 끝낸 몫은 버튼이 맡는다.
  const insertedIds = (inserted ?? []).map(row => row.id as number);
  if (insertedIds.length > 0) {
    after(async () => {
      try {
        const outcome = await fillPhotoMetadata(supabase, getCloudinaryConfig(), {
          ids: insertedIds,
          limit: insertedIds.length,
          deadline: Date.now() + 15_000,
        });
        if (!outcome.ok) {
          if (!outcome.migration) log.warn('admin_photos_metadata_after', outcome.error);
          return;
        }
        if (outcome.result.processed > 0) revalidateArchive();
      } catch (error) {
        log.warn('admin_photos_metadata_after', String(error));
      }
    });
  }

  return NextResponse.json({ ok: true, inserted: inserted?.length ?? rows.length, placesAdded });
}

// ── 수정 ──────────────────────────────────────────────────────────────────────

/**
 * 사진 한 장의 정보를 고친다. 보낸 필드만 바뀐다.
 *
 * `src`는 고칠 수 없다 — 다른 사진으로 바꾸는 건 수정이 아니라 새로 올리는
 * 일이고, 그 경로에는 업로드 서명과 폴더 규칙이 걸려 있다.
 */
export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoUpdate);
  if (!body.ok) return body.response;

  // 스키마를 통과했으면 바꿀 필드가 하나는 있다. 보내지 않은 키는 건드리지 않는다.
  const { id: photoId, ...fields } = body.value;
  const updates = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

  const db = adminDb('admin_photos');
  if (!db.ok) return db.response;

  // `select('*')`: 돌려주는 행의 컬럼을 이름으로 고르면 마이그레이션 전후로
  // 한쪽에서 실패한다. 화면은 받은 행으로 목록을 갈아 끼운다.
  const { data, error } = await db.value
    .from('photos')
    .update(updates)
    .eq('id', photoId)
    .select('*')
    .maybeSingle();

  if (error) return dbErrorResponse('admin_photos_update', error);
  if (!data) return jsonError('사진을 찾을 수 없습니다.', 404);
  revalidateArchive();
  return NextResponse.json(data);
}

// ── 삭제 ──────────────────────────────────────────────────────────────────────

/**
 * 사진 한 장을 아카이브에서 내린다.
 *
 * Cloudinary의 원본 파일은 **지우지 않는다.** 사이트에서 내리는 것과 원본을
 * 파기하는 것은 되돌릴 수 있는 정도가 다르고, 초기 사진들은 이 화면을 거치지
 * 않고 콘솔에서 직접 올라온 자산이다. 용량 정리는 Cloudinary 콘솔에서 한다.
 */
export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoDelete);
  if (!body.ok) return body.response;
  const db = adminDb('admin_photos');
  if (!db.ok) return db.response;

  const { data, error } = await db.value
    .from('photos')
    .delete()
    .eq('id', body.value.id)
    .select('id')
    .maybeSingle();

  if (error) return dbErrorResponse('admin_photos_delete', error);
  if (!data) return jsonError('사진을 찾을 수 없습니다.', 404);

  // 남은 사진의 sort_order에 구멍이 생기지만 정렬 결과는 같다. 번호를 다시
  // 매기는 것은 순서 변경(`photos/order`)이 할 일이다.
  revalidateArchive();
  return NextResponse.json({ ok: true, id: data.id });
}
