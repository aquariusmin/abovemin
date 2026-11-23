import { NextResponse } from 'next/server';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { log } from '@/lib/logger';
import { planYearSync, type CheckPhoto } from '@/lib/admin/data-checks';
import { YearSync } from '@/lib/admin/schemas';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminDb,
  dbErrorResponse,
  guardMutation,
  parseBody,
  runChunked,
} from '@/lib/admin/route-helpers';

// 연도는 본문으로 받지 않고 서버가 DB의 촬영일에서 다시 계산한다.
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, YearSync);
  if (!body.ok) return body.response;
  const db = adminDb('admin_photos_year_sync');
  if (!db.ok) return db.response;

  const { data, error } = await db.value.from('photos').select('id, year, taken_at').in('id', body.value.ids);
  if (error) return dbErrorResponse('admin_photos_year_sync_read', error, ARCHIVE_EXTRAS_MIGRATION);

  const plan = planYearSync((data ?? []) as Array<Pick<CheckPhoto, 'id' | 'year' | 'taken_at'>>);
  let updated = 0;
  const failed = await runChunked(plan, 4, async ({ year, ids }) => {
    const result = await db.value.from('photos').update({ year }).in('id', ids).select('id');
    updated += result.data?.length ?? 0;
    return result;
  });
  if (failed) return dbErrorResponse('admin_photos_year_sync_update', failed.error, ARCHIVE_EXTRAS_MIGRATION);

  if (updated > 0) {
    log.info('admin_photos_year_sync', { requested: body.value.ids.length, updated });
    revalidateArchive();
  }
  return NextResponse.json({ ok: true, updated, skipped: body.value.ids.length - updated });
}
