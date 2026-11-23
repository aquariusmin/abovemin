import { NextResponse } from 'next/server';
import { revalidateSettings } from '@/lib/admin/revalidate';
import { SettingsUpdate } from '@/lib/admin/schemas';
import { adminDb, dbErrorResponse, guardMutation, guardRead, parseBody } from '@/lib/admin/route-helpers';

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_settings');
  if (!db.ok) return db.response;

  const { data, error } = await db.value
    .from('site_settings')
    .select('key, value');
  if (error) return dbErrorResponse('admin_settings_fetch', error);

  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

// 아는 키만 저장한다. 히어로 이미지의 호스트 확인은 SettingsUpdate(schemas.ts)에서 한다.
export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, SettingsUpdate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_settings');
  if (!db.ok) return db.response;

  const now = new Date().toISOString();
  for (const [key, value] of body.value) {
    const { error } = await db.value
      .from('site_settings')
      .upsert({ key, value, updated_at: now }, { onConflict: 'key' });
    if (error) return dbErrorResponse(`admin_settings_upsert.${key}`, error);
  }

  revalidateSettings();
  return NextResponse.json({ ok: true });
}
