import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signSession, revoke, SESSION_COOKIE, isAdminRequest, passwordMatches } from '@/lib/auth';
import { rateLimitShared, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

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
  // 인스턴스를 넘는 제한. 로그인 시도는 in-memory 카운터로는 의미가 약하다
  // (서버리스에서는 사실상 "인스턴스당 5회").
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

  // 비밀번호는 맞았는데 세션 시크릿이 없다: 설정 문제다. 500으로 터지는 대신
  // 무엇이 빠졌는지 로그에 남기고 503으로 답한다.
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
  if (current) revoke(current);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
