import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { signSession, revoke, SESSION_COOKIE } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`admin-auth:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({ password: '' }));
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!passwordMatches(password)) {
    log.warn('admin_auth_failed', { ip });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, expires } = signSession();
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
  if (current) revoke(current);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
