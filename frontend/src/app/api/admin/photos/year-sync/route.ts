import { NextResponse } from 'next/server';
import { revalidateArchive } from '@/lib/cache-tags';
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

/**
 * 개요의 "연도와 촬영일 불일치" 고치기 — 사진의 `year`를 촬영일(`taken_at`)의
 * UTC 연도로 맞춘다.
 *
 * 화면이 보내는 것은 id뿐이다. 바꿀 연도는 서버가 **DB의 촬영일에서 다시
 * 계산한다**(`planYearSync`) — 화면이 본 뒤에 촬영일이나 연도가 바뀌었을 수
 * 있고, 연도를 본문으로 받으면 이 경로가 "아무 연도로나 바꾸기"가 된다. 이미
 * 맞아진 사진과 촬영일이 없는 사진은 건너뛴다.
 */
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
  // 같은 연도로 가는 사진은 update 한 번. 연도 종류는 많아야 몇 개다.
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
