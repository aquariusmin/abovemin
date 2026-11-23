import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { publicIdFromUrl } from '@/lib/cloudinary';
import { PhotoBulk, type PhotoBulkInput } from '@/lib/admin/schemas';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  jsonError,
  parseBody,
  runChunked,
} from '@/lib/admin/route-helpers';

// 이동만 행 단위다 — album_slug와 sort_order를 한 update에서 같이 바꿔 반쪽 행이 없다.
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoBulk);
  if (!body.ok) return body.response;
  const db = adminDb('admin_photos_bulk');
  if (!db.ok) return db.response;

  const input = body.value;
  const response =
    input.action === 'move' ? await move(db.value, input) : await updateOrDelete(db.value, input);

  if (response.ok) {
    log.info('admin_photos_bulk', { action: input.action, count: input.ids.length });
    revalidateArchive();
  }
  return response;
}

type MoveInput = Extract<PhotoBulkInput, { action: 'move' }>;

async function move(db: SupabaseClient, input: MoveInput): Promise<NextResponse> {
  const { data: album, error: albumError } = await db
    .from('albums')
    .select('slug')
    .eq('slug', input.album_slug)
    .maybeSingle();
  if (albumError) return dbErrorResponse('admin_photos_bulk_album', albumError);
  if (!album) return jsonError('옮길 앨범을 찾을 수 없습니다.', 404);

  const { data: rows, error: rowsError } = await db
    .from('photos')
    .select('id, album_slug')
    .in('id', input.ids);
  if (rowsError) return dbErrorResponse('admin_photos_bulk_rows', rowsError);
  if ((rows ?? []).length !== input.ids.length) {
    return jsonError('선택한 사진 중 이미 사라진 것이 있습니다. 새로 고친 뒤 다시 시도해 주세요.', 409);
  }

  const current = new Map((rows ?? []).map(row => [row.id as number, row.album_slug as string]));
  const moving = input.ids.filter(id => current.get(id) !== input.album_slug);
  if (moving.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const { data: last, error: lastError } = await db
    .from('photos')
    .select('sort_order')
    .eq('album_slug', input.album_slug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return dbErrorResponse('admin_photos_bulk_sort', lastError);
  const start = (last?.sort_order ?? 0) + 1;

  const failed = await runChunked(moving.map((id, i) => ({ id, sortOrder: start + i })), 8, ({ id, sortOrder }) =>
    db.from('photos').update({ album_slug: input.album_slug, sort_order: sortOrder }).eq('id', id),
  );
  if (failed) return dbErrorResponse('admin_photos_bulk_move', failed.error);

  return NextResponse.json({ ok: true, updated: moving.length });
}

async function updateOrDelete(
  db: SupabaseClient,
  input: Exclude<PhotoBulkInput, MoveInput>,
): Promise<NextResponse> {
  if (input.action === 'delete') {
    const { data: doomed, error: doomedError } = await db.from('photos').select('src').in('id', input.ids);
    if (doomedError) return dbErrorResponse('admin_photos_bulk_doomed', doomedError);
    const doomedIds = new Set((doomed ?? []).map(row => publicIdFromUrl(row.src as string)).filter(Boolean));

    const { data, error } = await db.from('photos').delete().in('id', input.ids).select('id');
    if (error) return dbErrorResponse('admin_photos_bulk_delete', error);

    const { data: albums } = await db.from('albums').select('title, cover');
    const coversLost = (albums ?? [])
      .filter(album => album.cover && doomedIds.has(publicIdFromUrl(album.cover as string)))
      .map(album => album.title as string);

    // Cloudinary 원본은 지우지 않는다. 정리는 설정 탭의 "쓰이지 않는 원본"에서 한다.
    return NextResponse.json({ ok: true, updated: data?.length ?? 0, coversLost });
  }

  const updates =
    input.action === 'location'
      ? { location: input.location }
      : input.action === 'year'
        ? { year: input.year }
        : { hidden: input.hidden };

  const { data, error } = await db.from('photos').update(updates).in('id', input.ids).select('id');
  if (error) return dbErrorResponse(`admin_photos_bulk_${input.action}`, error);
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
