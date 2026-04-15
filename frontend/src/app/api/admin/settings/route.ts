import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';
import { SETTINGS_CACHE_TAG } from '@/lib/supabase';

const ALLOWED_KEYS = ['hero_image', 'hero_title', 'hero_subtitle'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('site_settings')
    .select('key, value');

  if (error) {
    log.error('admin_settings_fetch', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates = Object.entries(body as Record<string, unknown>)
    .filter(([k, v]) => (ALLOWED_KEYS as readonly string[]).includes(k) && typeof v === 'string')
    .map(([k, v]) => [k as AllowedKey, v as string] as const);

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid keys' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const [key, value] of updates) {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: now }, { onConflict: 'key' });
    if (error) {
      log.error('admin_settings_upsert', { key, error });
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
  }

  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
