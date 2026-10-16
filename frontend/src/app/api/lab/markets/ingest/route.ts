import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';
import { BUCKET, FILES, MAX_BODY_BYTES, objectPath, tokenMatches, uploadSchema } from '@/lib/markets/ingest';

/**
 * Upload from the owner's PC (market-intelligence-dashboard `mi_cli.py publish`).
 *
 * Not an `api/admin/*` route: the caller is a cron job, not a browser session,
 * so there is no cookie and no Origin to check. It is guarded by a bearer token
 * (MI_PUBLISH_TOKEN, ≥32 chars, Vercel env) that can do exactly one thing —
 * replace the three files of the private `mi-dashboard` bucket.
 */
export async function POST(request: Request) {
  if (!tokenMatches(request.headers.get('authorization'), process.env.MI_PUBLISH_TOKEN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  const parsed = uploadSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  let client;
  try {
    client = getSupabaseAdmin();
  } catch (error) {
    log.error('markets.ingest_config', error);
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 });
  }
  const written: string[] = [];
  for (const name of FILES) {
    const body = parsed.data.files[name];
    if (body === null) continue;  // the producer had nothing for this file; keep the previous copy
    const { error } = await client.storage
      .from(BUCKET)
      .upload(objectPath(name), JSON.stringify(body), { upsert: true, contentType: 'application/json' });
    if (error) {
      log.error('markets.ingest_write', { name, error: error.message });
      return NextResponse.json({ error: `write failed: ${name}`, written }, { status: 503 });
    }
    written.push(name);
  }
  return NextResponse.json({ ok: true, written, generated_at: parsed.data.files.core.generated_at });
}
