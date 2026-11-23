import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signSession, revoke, SESSION_COOKIE, isAdminRequest, passwordMatches } from '@/lib/auth';
import { rateLimitShared, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

// "로그인 안 됨"은 정상 응답이라 401 대신 200 + { authed: false }로 답한다.
export async function GET() {
  return NextResponse.json({ authed: await isAdminRequest() });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  // 인스턴스를 넘는 제한 — 서버리스에서 in-memory 카운터는 인스턴스당 제한이 된다.
  const rl = await rateLimitShared(`admin-auth:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({ password: '' }));
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    log.warn('admin_auth_failed', { ip });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let session: ReturnType<typeof signSession>;
  try {
    session = signSession();
  } catch (error) {
    log.error('admin_session_secret_unavailable', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Admin session is not configured' }, { status: 503 });
  }
  const { token, expires } = session;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expires),
    sameSite: 'strict',
  });
  return response;
}

export async function DELETE() {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  if (current) await revoke(current);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
