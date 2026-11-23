import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { countLocations, findLocationVariants } from '@/lib/admin/data-checks';
import { LocationRename } from '@/lib/admin/schemas';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  parseBody,
} from '@/lib/admin/route-helpers';

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
