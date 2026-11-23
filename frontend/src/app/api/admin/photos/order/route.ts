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

// PostgREST는 행마다 다른 값을 한 문장으로 못 써서 행마다 호출한다.
const CHUNK = 8;

// 전체 id 목록을 받고, 집합이 DB와 다르면 409. 트랜잭션이 없어 멱등으로 수렴하게 한다.
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
    // 스키마 오류가 아니면 일부만 반영됐을 수 있다 — "다시 시도"로 안내한다(멱등).
    if (isMissingSchemaError(failed.error)) return dbErrorResponse('admin_photos_order_update', failed.error);
    log.error('admin_photos_order_update', failed.error);
    return jsonError('순서를 저장하지 못했습니다. 다시 시도해 주세요.', 500);
  }

  revalidateArchive();
  return NextResponse.json({ ok: true, updated: changes.length });
}
