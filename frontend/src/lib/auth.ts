import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { log } from './logger';
import { getSupabaseAdmin } from './supabase-admin';
import { isRevoked, recordRevocation, type RevocationDb } from './admin/session-revocation';

// 관리자 세션. 토큰: `${nonce}:${issuedAt}:${expires}:${sig}`.
// 로그아웃한 nonce는 이 인스턴스의 메모리와 Supabase(`session-revocation.ts`)에
// 함께 남겨, 다른 인스턴스에서도 다시 쓰이지 않게 한다.

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

  // 시크릿이 없으면 `getSecret`이 throw한다. 그대로 두면 관리 API 전부와
  // `/api/admin/auth`의 GET이 500이 된다 — 설정 누락을 "로그인 안 됨"으로 읽고,
  // 원인은 로그에 남긴다. 서명할 수 없는 서버가 서명을 믿을 수는 없다.
  let secret: string;
  try {
    secret = getSecret();
  } catch (error) {
    log.error('admin_session_secret_unavailable', error instanceof Error ? error.message : error);
    return false;
  }
  const expected = createHmac('sha256', secret)
    .update(`${nonce}:${issuedAtStr}:${expiresStr}`)
    .digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 관리자 비밀번호 비교. 두 값을 SHA-256으로 같은 길이(32바이트)로 만든 뒤
 * 비교한다 — 원문을 바로 `timingSafeEqual`에 넣으려면 길이가 같아야 해서, 예전
 * 코드는 길이가 다르면 먼저 돌아갔고 그 응답 시간 차이로 비밀번호 길이가
 * 드러났다.
 */
export function passwordMatches(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function revocationDb(): RevocationDb | null {
  try {
    return getSupabaseAdmin() as unknown as RevocationDb;
  } catch {
    return null;
  }
}

export async function revoke(token: string): Promise<void> {
  const parts = token.split(':');
  if (parts.length !== 4) return;
  const [nonce, , expiresStr] = parts;
  revokedNonces.add(nonce);
  const expires = Number(expiresStr);
  const db = revocationDb();
  if (db && Number.isFinite(expires) && expires > Date.now()) await recordRevocation(db, nonce, expires);
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (!verifySession(token)) return false;
  const db = revocationDb();
  if (!db) return false;
  return !(await isRevoked(db, token!.split(':')[0]));
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
