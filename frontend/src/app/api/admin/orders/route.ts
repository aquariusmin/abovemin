import { NextResponse } from 'next/server';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('admin_orders_fetch', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number((body as { id?: unknown }).id);
  const status = (body as { status?: unknown }).status;
  const VALID = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
  if (!Number.isFinite(id) || typeof status !== 'string' || !VALID.includes(status as typeof VALID[number])) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('orders').update({ status }).eq('id', id);
  if (error) {
    log.error('admin_orders_update', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
