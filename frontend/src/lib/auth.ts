import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// 관리자 세션 관리.
//
// 토큰 구조: `${nonce}:${issuedAt}:${expires}:${sig}`
// - 로그아웃 시 해당 nonce를 revoke set에 추가해 재사용 차단
//
// ⚠️ in-memory 저장이라 서버리스 인스턴스 간 공유되지 않음.
// 단일 admin 사용 + sameSite=strict 쿠키 전제라 실제 공격 벡터는 매우 좁음.
// 강한 보장을 원하면 Supabase에 admin_sessions 테이블 추가 권장.

const SECRET_RAW = process.env.ADMIN_SESSION_SECRET;
const LEGACY_SECRET = process.env.ADMIN_PASSWORD;

function getSecret(): string {
  if (SECRET_RAW && SECRET_RAW.length >= 16) return SECRET_RAW;
  if (LEGACY_SECRET) {
    // 개발 편의. 프로덕션에서는 ADMIN_SESSION_SECRET 분리 필수.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SESSION_SECRET must be set in production (min 16 chars)');
    }
    return LEGACY_SECRET;
  }
  throw new Error('ADMIN_SESSION_SECRET is not configured');
}

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8h
export const SESSION_COOKIE = 'admin_session';

const revokedNonces = new Set<string>();

export function signSession(): { token: string; expires: number } {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = Date.now();
  const expires = issuedAt + SESSION_DURATION_MS;
  const payload = `${nonce}:${issuedAt}:${expires}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return { token: `${payload}:${sig}`, expires };
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 4) return false;
  const [nonce, issuedAtStr, expiresStr, sig] = parts;
  const issuedAt = Number(issuedAtStr);
  const expires = Number(expiresStr);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expires)) return false;
  if (Date.now() > expires) return false;
  if (revokedNonces.has(nonce)) return false;

  const expected = createHmac('sha256', getSecret())
    .update(`${nonce}:${issuedAtStr}:${expiresStr}`)
    .digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function revoke(token: string): void {
  const parts = token.split(':');
  if (parts.length === 4) revokedNonces.add(parts[0]);
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

// CSRF: 상태 변경 요청은 동일 origin에서 왔는지 확인.
export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
