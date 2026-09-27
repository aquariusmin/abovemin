import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/cache-tags';
import { countLocations, findLocationVariants } from '@/lib/admin/data-checks';
import { LocationRename } from '@/lib/admin/schemas';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  parseBody,
} from '@/lib/admin/route-helpers';

/**
 * 장소 이름 관리. 아카이브 필터가 장소 **문자열**로 묶기 때문에 "서울"(58장)과
 * "Seoul"(1장)은 공개 화면에서 서로 다른 두 곳이 된다. 한 장씩 고치는 대신
 * 표기 하나를 통째로 바꾼다.
 */

/** 쓰이는 장소 표기 전부와 개수, 그리고 같은 곳으로 보이는 묶음. */
export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_locations');
  if (!db.ok) return db.response;

  const { data, error } = await db.value.from('photos').select('location');
  if (error) return dbErrorResponse('admin_locations_fetch', error);

  const locations = countLocations((data ?? []).map(row => row.location as string | null));
  return NextResponse.json({ locations, variants: findLocationVariants(locations) });
}

/**
 * `from` 표기를 가진 모든 사진의 장소를 `to`로 바꾼다. SQL 한 문장.
 * `dry_run: true`면 바꾸지 않고 몇 장이 바뀔지만 센다 — 화면의 미리보기.
 */
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, LocationRename);
  if (!body.ok) return body.response;
  const db = adminDb('admin_locations');
  if (!db.ok) return db.response;

  const { from, to, dry_run } = body.value;

  if (dry_run) {
    const { count, error } = await db.value
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('location', from);
    if (error) return dbErrorResponse('admin_locations_preview', error);
    return NextResponse.json({ ok: true, dryRun: true, count: count ?? 0 });
  }

  const { data, error } = await db.value
    .from('photos')
    .update({ location: to })
    .eq('location', from)
    .select('id');
  if (error) return dbErrorResponse('admin_locations_rename', error);

  const updated = data?.length ?? 0;
  log.info('admin_locations_renamed', { from, to, updated });
  if (updated > 0) revalidateArchive();
  return NextResponse.json({ ok: true, count: updated });
}
