import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 서버 전용. service-role 키 사용 — 클라이언트 번들에 포함되면 안 됨.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ROLE_KEY;
  if (!url || !key) {
    const missing = [
      !url && 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)',
      !key && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean);
    throw new Error(`Supabase admin configuration is missing: ${missing.join(', ')}`);
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
