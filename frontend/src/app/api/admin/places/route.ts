import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/logger';
import { isMissingSchemaError } from '@/lib/db-compat';
import { placeFromRow, placeName } from '@/lib/places';
import { PlaceDelete, PlaceUpsert } from '@/lib/admin/schemas';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  parseBody,
} from '@/lib/admin/route-helpers';

/**
 * 장소 좌표 — `/archive` 지도가 점을 찍는 자리. 장소 **이름** 하나에 좌표
 * 하나이고, 소수점 한 자리(약 11km)다(`schemas.ts`의 `PlaceUpsert`).
 *
 * 사진 한 장 한 장의 GPS는 어디에도 저장하지 않는다. 채우기 작업이 사진 GPS의
 * 중앙값으로 여기에 한 줄을 넣고(`source: 'gps'`), 사람이 고치면 `manual`이
 * 된다. 채우기 작업은 이미 있는 행을 덮어쓰지 않는다.
 */

interface AdminPlaceRow {
  name: string;
  /** 이 이름을 쓰는 사진 수(숨긴 사진 포함). 0이면 이름을 바꾼 뒤 남은 행이다. */
  count: number;
  lat: number | null;
  lng: number | null;
  source: 'gps' | 'manual' | null;
}

function revalidateMap(): void {
  // 지도는 /archive에만 있다. 앨범 상세와 홈은 좌표를 쓰지 않는다.
  revalidatePath('/archive');
}

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_places');
  if (!db.ok) return db.response;

  const [photos, places] = await Promise.all([
    db.value.from('photos').select('location'),
    db.value.from('places').select('name, lat, lng, source'),
  ]);
  if (photos.error) return dbErrorResponse('admin_places_photos', photos.error);

  const counts = new Map<string, number>();
  for (const row of photos.data ?? []) {
    const name = placeName(row.location as string | null);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const migrationPending = Boolean(places.error && isMissingSchemaError(places.error));
  if (places.error && !migrationPending) return dbErrorResponse('admin_places_fetch', places.error);

  const rows = new Map<string, AdminPlaceRow>();
  for (const [name, count] of counts) rows.set(name, { name, count, lat: null, lng: null, source: null });
  for (const raw of places.data ?? []) {
    const coord = placeFromRow(raw);
    if (!coord) continue;
    const source = raw.source === 'gps' ? 'gps' : 'manual';
    rows.set(coord.name, { ...coord, count: counts.get(coord.name) ?? 0, source });
  }

  const list = [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
  return NextResponse.json({ places: list, migrationPending });
}

/** 좌표를 저장한다. 사람이 적은 값이므로 `source`는 `manual`이 된다. */
export async function PUT(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PlaceUpsert);
  if (!body.ok) return body.response;
  const db = adminDb('admin_places');
  if (!db.ok) return db.response;

  const { name, lat, lng } = body.value;
  const { data, error } = await db.value
    .from('places')
    .upsert({ name, lat, lng, source: 'manual' }, { onConflict: 'name' })
    .select('name, lat, lng, source')
    .maybeSingle();
  if (error) return dbErrorResponse('admin_places_upsert', error, ARCHIVE_EXTRAS_MIGRATION);

  log.info('admin_places_saved', { name, lat, lng });
  revalidateMap();
  return NextResponse.json({ ok: true, place: data ? placeFromRow(data) : { name, lat, lng } });
}

/** 좌표를 지운다. 그 장소는 지도에서 빠진다(사진은 그대로). */
export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PlaceDelete);
  if (!body.ok) return body.response;
  const db = adminDb('admin_places');
  if (!db.ok) return db.response;

  const { data, error } = await db.value.from('places').delete().eq('name', body.value.name).select('name');
  if (error) return dbErrorResponse('admin_places_delete', error, ARCHIVE_EXTRAS_MIGRATION);

  if ((data?.length ?? 0) > 0) revalidateMap();
  return NextResponse.json({ ok: true, deleted: data?.length ?? 0 });
}
