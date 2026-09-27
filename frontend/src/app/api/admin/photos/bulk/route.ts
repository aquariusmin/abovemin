import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/cache-tags';
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

/**
 * 사진 여러 장에 한 가지 작업을 한다 — 이동, 장소, 연도, 숨김, 삭제.
 *
 * 장소·연도·숨김·삭제는 **SQL 한 번**이다(`where id in (…)`). 전부 같은 값을
 * 쓰므로 행마다 보낼 이유가 없고, 한 문장이라 중간에 일부만 반영될 일도 없다.
 *
 * 이동만 예외다. 옮긴 사진은 대상 앨범의 **끝에** 순서대로 붙어야 하고, 그러면
 * 행마다 `sort_order`가 다르다. PostgREST는 행마다 다른 값을 한 문장으로 쓸 수
 * 없어 행 단위로 보낸다 — 대신 각 행이 `album_slug`와 `sort_order`를 **한
 * update에서 같이** 바꾸므로, 중간에 실패해도 "앨범은 옮겨졌는데 순서는 옛
 * 앨범 것" 같은 반쪽 행은 생기지 않는다. 남은 것만 다시 보내면 된다.
 */
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

  // 이미 그 앨범에 있는 사진은 건드리지 않는다 — "이동"이 순서를 흔들면 안 된다.
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

  // 화면에서 보낸 순서(= 화면에 보이던 순서) 그대로 끝에 붙는다.
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
    // 지우기 전에 이 사진들이 앨범 커버인지 본다. 막지는 않는다 — 커버로 쓰던
    // 사진을 내리는 것도 정상적인 작업이다. 대신 어느 앨범의 커버가 비게
    // 되는지 알려 줘서, 개요의 데이터 점검으로 가기 전에 알게 한다.
    const { data: doomed, error: doomedError } = await db.from('photos').select('src').in('id', input.ids);
    if (doomedError) return dbErrorResponse('admin_photos_bulk_doomed', doomedError);
    const doomedIds = new Set((doomed ?? []).map(row => publicIdFromUrl(row.src as string)).filter(Boolean));

    const { data, error } = await db.from('photos').delete().in('id', input.ids).select('id');
    if (error) return dbErrorResponse('admin_photos_bulk_delete', error);

    const { data: albums } = await db.from('albums').select('title, cover');
    const coversLost = (albums ?? [])
      .filter(album => album.cover && doomedIds.has(publicIdFromUrl(album.cover as string)))
      .map(album => album.title as string);

    // Cloudinary 원본은 지우지 않는다(`api/admin/photos` DELETE와 같은 원칙).
    // 정리는 설정 탭의 "쓰이지 않는 원본"에서 한다.
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
