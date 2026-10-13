import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { isMissingSchemaError } from '@/lib/db-compat';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { PhotoOrder } from '@/lib/admin/schemas';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  jsonError,
  parseBody,
  runChunked,
} from '@/lib/admin/route-helpers';

/** 동시에 보낼 update 수. PostgREST는 한 번에 하나의 값만 쓰므로 행마다 호출한다. */
const CHUNK = 8;

/**
 * 앨범 안 사진 순서를 통째로 다시 매긴다. 받은 `ids` 순서대로 `sort_order`가
 * 1..n이 된다.
 *
 * 전체 목록을 받는 이유는 부분 이동만 받으면 서버가 나머지를 어떻게 밀어야
 * 할지 추측해야 하고, 그 사이 다른 곳에서 사진이 추가되면 어긋나기 때문이다.
 * 보낸 id 집합이 DB의 그 앨범 사진과 정확히 일치하지 않으면 409로 거절한다 —
 * 화면이 낡았다는 뜻이므로 다시 불러와야 한다.
 *
 * PostgREST에는 트랜잭션이 없어 중간에 실패하면 일부만 반영될 수 있다. 대신
 * 이 요청은 멱등이다: 같은 `ids`를 다시 보내면 같은 결과로 수렴한다.
 */
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoOrder);
  if (!body.ok) return body.response;
  const db = adminDb('admin_photos_order');
  if (!db.ok) return db.response;

  const { album_slug: albumSlug, ids } = body.value;
  const { data: current, error: fetchError } = await db.value
    .from('photos')
    .select('id, sort_order')
    .eq('album_slug', albumSlug);

  if (fetchError) return dbErrorResponse('admin_photos_order_fetch', fetchError);

  const rows = current ?? [];
  const known = new Map(rows.map(row => [row.id as number, row.sort_order as number]));
  if (rows.length !== ids.length || ids.some(id => !known.has(id))) {
    return jsonError('목록이 최신이 아닙니다. 새로 고친 뒤 다시 시도해 주세요.', 409);
  }

  // 값이 이미 맞는 행은 건드리지 않는다 — 한 칸 이동이면 보통 두 행만 바뀐다.
  const changes = ids
    .map((id, index) => ({ id, sortOrder: index + 1 }))
    .filter(({ id, sortOrder }) => known.get(id) !== sortOrder);

  if (changes.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const failed = await runChunked(changes, CHUNK, ({ id, sortOrder }) =>
    db.value.from('photos').update({ sort_order: sortOrder }).eq('id', id),
  );
  if (failed) {
    // 스키마가 없어서 난 오류만 공통 응답(409 + 마이그레이션 안내)으로 보낸다. 그
    // 밖의 실패는 일부만 반영됐을 수 있으므로 "다시 시도"라고 말해야 한다 — 이
    // 요청은 멱등이다.
    if (isMissingSchemaError(failed.error)) return dbErrorResponse('admin_photos_order_update', failed.error);
    log.error('admin_photos_order_update', failed.error);
    return jsonError('순서를 저장하지 못했습니다. 다시 시도해 주세요.', 500);
  }

  revalidateArchive();
  return NextResponse.json({ ok: true, updated: changes.length });
}
