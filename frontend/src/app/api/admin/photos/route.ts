import { NextResponse } from 'next/server';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCloudinaryConfig, isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';

/** 한 번에 넣을 수 있는 장수. 업로드 UI가 배치로 보내므로 상한만 둔다. */
const MAX_BATCH = 60;
/** 사진술의 시작(1826) ~ 내년. 오타로 들어온 연도를 걸러내는 정도의 범위. */
const MIN_YEAR = 1826;

const ALBUM_SLUG = /^[a-z0-9-]{1,64}$/;

// ── 필드 검증 ─────────────────────────────────────────────────────────────────
// 추가(POST)와 수정(PATCH)이 같은 규칙을 쓴다. 성공하면 정규화된 값을, 실패하면
// 사람이 읽을 메시지를 돌려준다.

function parseTitle(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value.trim().length === 0) return { error: '제목이 비어 있습니다.' };
  if (value.trim().length > 200) return { error: '제목이 너무 깁니다.' };
  return value.trim();
}

function parseLocation(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value.length > 200) return { error: '장소가 올바르지 않습니다.' };
  return value.trim();
}

function parseYear(value: unknown): number | { error: string } {
  const year = Number(value);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > new Date().getFullYear() + 1) {
    return { error: '연도가 올바르지 않습니다.' };
  }
  return year;
}

function isError<T>(value: T | { error: string }): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

/** 한 앨범의 사진 전부. 관리 화면에서 정보를 고치기 위한 목록이다. */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const albumSlug = new URL(request.url).searchParams.get('album');
  if (!albumSlug || !ALBUM_SLUG.test(albumSlug)) {
    return NextResponse.json({ error: 'Invalid album' }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('photos')
    .select('id, src, title, location, year, sort_order')
    .eq('album_slug', albumSlug)
    .order('sort_order');

  if (error) {
    log.error('admin_photos_list', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// ── 추가 ──────────────────────────────────────────────────────────────────────

interface IncomingPhoto {
  src: string;
  title: string;
  location: string;
  year: number;
}

function parsePhoto(raw: unknown, cloudName: string): IncomingPhoto | { error: string } {
  if (typeof raw !== 'object' || raw === null) return { error: '사진 항목이 올바르지 않습니다.' };
  const { src, title, location, year } = raw as Record<string, unknown>;

  if (typeof src !== 'string' || !isOwnCloudinaryUrl(src, cloudName)) {
    return { error: '이 사이트의 Cloudinary 주소가 아닙니다.' };
  }
  const parsedTitle = parseTitle(title);
  if (isError(parsedTitle)) return parsedTitle;
  const parsedLocation = parseLocation(location);
  if (isError(parsedLocation)) return parsedLocation;
  const parsedYear = parseYear(year);
  if (isError(parsedYear)) return parsedYear;

  return { src, title: parsedTitle, location: parsedLocation, year: parsedYear };
}

/**
 * 업로드가 끝난 사진들을 `photos`에 한 번에 넣는다.
 *
 * 파일 자체는 이미 브라우저 → Cloudinary로 직접 올라간 뒤이고, 여기로 오는 건
 * 그 결과 URL과 메타데이터뿐이다.
 */
export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const albumSlug = (body as { album_slug?: unknown }).album_slug;
  const rawPhotos = (body as { photos?: unknown }).photos;

  if (typeof albumSlug !== 'string' || !ALBUM_SLUG.test(albumSlug)) {
    return NextResponse.json({ error: 'Invalid album_slug' }, { status: 400 });
  }
  if (!Array.isArray(rawPhotos) || rawPhotos.length === 0) {
    return NextResponse.json({ error: '저장할 사진이 없습니다.' }, { status: 400 });
  }
  if (rawPhotos.length > MAX_BATCH) {
    return NextResponse.json({ error: `한 번에 ${MAX_BATCH}장까지 저장할 수 있습니다.` }, { status: 400 });
  }

  let cloudName: string;
  try {
    cloudName = getCloudinaryConfig().cloudName;
  } catch (error) {
    log.error('admin_photos_cloudinary', error);
    return NextResponse.json({ error: 'Cloudinary upload is not configured' }, { status: 503 });
  }

  const photos: IncomingPhoto[] = [];
  for (const [i, raw] of rawPhotos.entries()) {
    const parsed = parsePhoto(raw, cloudName);
    if (isError(parsed)) {
      return NextResponse.json({ error: `${i + 1}번째 사진: ${parsed.error}` }, { status: 400 });
    }
    photos.push(parsed);
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('slug')
    .eq('slug', albumSlug)
    .single();
  if (albumError || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  // 새 사진은 앨범 끝에 붙인다. 관리자 한 명이 쓰는 화면이라 동시 삽입 경합은
  // 고려하지 않는다 — 겹치더라도 정렬 순서만 흔들리고 데이터는 남는다.
  const { data: last, error: orderError } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('album_slug', albumSlug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) {
    log.error('admin_photos_sort_order', orderError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
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
  if (insertError) {
    log.error('admin_photos_insert', insertError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // 아카이브 페이지는 `revalidate = 0`이라 다음 요청에서 바로 반영된다.
  return NextResponse.json({ ok: true, inserted: inserted?.length ?? rows.length });
}

// ── 수정 ──────────────────────────────────────────────────────────────────────

/**
 * 사진 한 장의 정보를 고친다. 보낸 필드만 바뀐다.
 *
 * `src`는 고칠 수 없다 — 다른 사진으로 바꾸는 건 수정이 아니라 새로 올리는
 * 일이고, 그 경로에는 업로드 서명과 폴더 규칙이 걸려 있다.
 */
export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { id, title, location, year } = body as Record<string, unknown>;

  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const updates: Record<string, string | number> = {};
  if (title !== undefined) {
    const parsed = parseTitle(title);
    if (isError(parsed)) return NextResponse.json({ error: parsed.error }, { status: 400 });
    updates.title = parsed;
  }
  if (location !== undefined) {
    const parsed = parseLocation(location);
    if (isError(parsed)) return NextResponse.json({ error: parsed.error }, { status: 400 });
    updates.location = parsed;
  }
  if (year !== undefined) {
    const parsed = parseYear(year);
    if (isError(parsed)) return NextResponse.json({ error: parsed.error }, { status: 400 });
    updates.year = parsed;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', photoId)
    .select('id, src, title, location, year, sort_order')
    .maybeSingle();

  if (error) {
    log.error('admin_photos_update', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 });
  }
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
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const photoId = Number((body as { id?: unknown }).id);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('admin_photos_delete', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 남은 사진의 sort_order에 구멍이 생기지만 정렬 결과는 같다. 번호를 다시
  // 매기는 것은 순서 변경(`photos/order`)이 할 일이다.
  return NextResponse.json({ ok: true, id: data.id });
}
