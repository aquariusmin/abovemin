import { NextResponse } from 'next/server';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { IdOrder } from '@/lib/admin/schemas';
import { renumberChanges, sameIdSet } from '@/lib/admin/reorder';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  jsonError,
  parseBody,
  runChunked,
} from '@/lib/admin/route-helpers';

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, IdOrder);
  if (!body.ok) return body.response;
  const db = adminDb('admin_albums_order');
  if (!db.ok) return db.response;

  const { data, error } = await db.value.from('albums').select('id, sort_order');
  if (error) return dbErrorResponse('admin_albums_order_fetch', error);

  const rows = (data ?? []) as Array<{ id: number; sort_order: number }>;
  const known = new Map(rows.map(row => [row.id, row.sort_order]));
  if (!sameIdSet(body.value.ids, known.keys())) {
    return jsonError('목록이 최신이 아닙니다. 새로 고친 뒤 다시 시도해 주세요.', 409);
  }

  const changes = renumberChanges(body.value.ids, known);
  if (changes.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const failed = await runChunked(changes, 8, ({ id, sortOrder }) =>
    db.value.from('albums').update({ sort_order: sortOrder }).eq('id', id),
  );
  if (failed) return dbErrorResponse('admin_albums_order_update', failed.error);

  revalidateArchive();
  return NextResponse.json({ ok: true, updated: changes.length });
}
