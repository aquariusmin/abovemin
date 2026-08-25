import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';

/** 사진 업로드 UI의 앨범 선택지. 공개 페이지와 달리 커버/정렬만 있으면 된다. */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_albums_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('albums')
    .select('id, title, slug')
    .order('sort_order');

  if (error) {
    log.error('admin_albums_fetch', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
