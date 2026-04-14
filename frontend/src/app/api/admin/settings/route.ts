import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../auth/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthed(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const token = cookieStore.get('admin_session')?.value;
  return token ? verifyToken(token) : false;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: Record<string, string> = await request.json().catch(() => ({}));
  const ALLOWED_KEYS = ['hero_image', 'hero_title', 'hero_subtitle'];

  const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key));
  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid keys' }, { status: 400 });
  }

  for (const [key, value] of updates) {
    await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }

  return NextResponse.json({ ok: true });
}
