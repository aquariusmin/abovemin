import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { signSession, revoke, SESSION_COOKIE, isAdminRequest } from '@/lib/auth';
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

/**
 * 지금 이 브라우저가 로그인 상태인지 묻는다.
 *
 * 세션 쿠키는 HttpOnly라 클라이언트가 직접 읽을 수 없고, 그래서 `/admin`은
 * 새로고침할 때마다 멀쩡한 8시간 세션을 두고 비밀번호를 다시 받고 있었다.
 *
 * 401이 아니라 200 + `{ authed: false }`로 답하는 이유: "로그인 안 됨"은 이
 * 질문에 대한 **정상 응답**이지 오류가 아니다. 401로 답하면 관리 화면을 열
 * 때마다 콘솔과 네트워크 탭에 빨간 줄이 하나씩 남고, 진짜 인증 실패와
 * 구분되지 않는다.
 */
export async function GET() {
  return NextResponse.json({ authed: await isAdminRequest() });
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
