import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { isMissingSchemaError } from '@/lib/db-compat';
import { placeFromRow, placeName } from '@/lib/places';
import { revalidatePlaces } from '@/lib/admin/revalidate';
import { PlaceDelete, PlaceUpsert } from '@/lib/admin/schemas';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  parseBody,
} from '@/lib/admin/route-helpers';

// 사진별 GPS는 저장하지 않는다 — 장소 이름당 좌표 하나, 소수점 한 자리(약 11km).

interface AdminPlaceRow {
  name: string;
  count: number;
  lat: number | null;
  lng: number | null;
  source: 'gps' | 'manual' | null;
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
  revalidatePlaces();
  return NextResponse.json({ ok: true, place: data ? placeFromRow(data) : { name, lat, lng } });
}

export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PlaceDelete);
  if (!body.ok) return body.response;
  const db = adminDb('admin_places');
  if (!db.ok) return db.response;

  const { data, error } = await db.value.from('places').delete().eq('name', body.value.name).select('name');
  if (error) return dbErrorResponse('admin_places_delete', error, ARCHIVE_EXTRAS_MIGRATION);

  if ((data?.length ?? 0) > 0) revalidatePlaces();
  return NextResponse.json({ ok: true, deleted: data?.length ?? 0 });
}
