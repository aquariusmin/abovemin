import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';
import { SETTINGS_CACHE_TAG } from '@/lib/cache-tags';
import { isRenderableImageUrl } from '@/lib/cloudinary';

const ALLOWED_KEYS = ['hero_image', 'hero_title', 'hero_subtitle'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_settings_config', error);
    return NextResponse.json(
      { error: 'Admin database is not configured' },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
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

  // `hero_image`는 홈에서 `next/image`로 렌더된다. 허용되지 않은 호스트가 들어
  // 가면 렌더 도중 throw가 나고 홈 전체가 error 바운더리로 떨어지므로, 저장을
  // 막는 쪽이 맞다 — 잘못된 값이 이미 들어간 뒤에는 관리 화면에서 되돌리기
  // 전까지 홈이 계속 깨져 있다.
  const heroImage = updates.find(([key]) => key === 'hero_image')?.[1];
  if (heroImage !== undefined && heroImage !== '' && !isRenderableImageUrl(heroImage)) {
    return NextResponse.json(
      { error: '히어로 이미지는 res.cloudinary.com 또는 images.unsplash.com의 https 주소여야 합니다.' },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_settings_config', error);
    return NextResponse.json(
      { error: 'Admin database is not configured' },
      { status: 503 },
    );
  }
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
