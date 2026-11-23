import { NextResponse, after } from 'next/server';
import { isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { PHOTO_COLUMN_LEVEL, photoColumnSets, selectWithColumnSets } from '@/lib/admin/photo-columns';
import {
  CLOUDINARY_UPLOAD_NOT_CONFIGURED,
  adminCloudinary,
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

const LIST_COLUMN_SETS = photoColumnSets('id, album_slug, src, title, location, year, sort_order');

// 숨긴 사진도 포함한다. migrationPending은 hidden/created_at이 없을 때(admin-studio 전)만.
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

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoCreate);
  if (!body.ok) return body.response;
  const albumSlug = body.value.album_slug;

  const cloudinary = adminCloudinary('admin_photos', CLOUDINARY_UPLOAD_NOT_CONFIGURED);
  if (!cloudinary.ok) return cloudinary.response;
  const { cloudName } = cloudinary.value;

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

  // 관리자 한 명이 쓰는 화면이라 동시 삽입 경합은 고려하지 않는다.
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

  // 기존 places 행은 덮어쓰지 않는다. places가 없으면(archive-extras 전) 조용히 건너뛴다.
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

  // 응답 뒤(`after`)에 채운다. 함수 시간 상한을 넘지 않게 새 요청은 15초에서 멈춘다.
  const insertedIds = (inserted ?? []).map(row => row.id as number);
  if (insertedIds.length > 0) {
    after(async () => {
      try {
        const outcome = await fillPhotoMetadata(supabase, cloudinary.value, {
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

// src는 고칠 수 없다 — 교체는 업로드 서명·폴더 규칙을 거치는 새 업로드다.
export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoUpdate);
  if (!body.ok) return body.response;

  const { id: photoId, ...fields } = body.value;
  const updates = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

  const db = adminDb('admin_photos');
  if (!db.ok) return db.response;

  // select('*'): 컬럼을 이름으로 고르면 마이그레이션 전후 한쪽에서 실패한다.
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

// Cloudinary 원본은 지우지 않는다 — 내리기와 파기는 되돌릴 수 있는 정도가 다르다.
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

  revalidateArchive();
  return NextResponse.json({ ok: true, id: data.id });
}
