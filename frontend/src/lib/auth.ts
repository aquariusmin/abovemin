import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { log } from './logger';
import { getSupabaseAdmin } from './supabase-admin';
import { isRevoked, recordRevocation, type RevocationDb } from './admin/session-revocation';

// 관리자 세션 토큰: `${nonce}:${issuedAt}:${expires}:${sig}`. 로그아웃한 nonce는 메모리와 Supabase에 기록.
const SECRET_RAW = process.env.ADMIN_SESSION_SECRET;
const LEGACY_SECRET = process.env.ADMIN_PASSWORD;

function getSecret(): string {
  if (SECRET_RAW && SECRET_RAW.length >= 16) return SECRET_RAW;
  if (LEGACY_SECRET) {
    // 개발 전용 폴백. 프로덕션은 ADMIN_SESSION_SECRET 필수.
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

  // 시크릿 누락은 실패로 닫는다(fail closed): 서명할 수 없는 서버는 서명을 믿지 않는다.
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

// 해시로 길이를 맞춘 뒤 timing-safe 비교 — 길이 차로 비밀번호 길이가 새지 않게.
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
