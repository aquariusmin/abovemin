import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { exists, kvEnabled, setWithTtl } from './kv';

// 관리자 세션 관리.
//
// 토큰 구조: `${nonce}:${issuedAt}:${expires}:${sig}`
// - 로그아웃 시 해당 nonce를 revoke set에 추가해 재사용 차단
//
// revoke set은 in-memory가 기본이라 서버리스 인스턴스 간 공유되지 않는다.
// Upstash가 설정돼 있으면(`lib/kv`) 그쪽에도 같이 적어, 로그아웃이 인스턴스를
// 넘어 효력을 갖는다. 설정이 없으면 예전과 똑같이 동작한다.

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
  if (parts.length !== 4) return;
  const [nonce, , expiresStr] = parts;
  revokedNonces.add(nonce);

  // 공유 저장소에도 남긴다. 토큰이 어차피 만료되는 시점까지만 보관하면
  // 되므로 TTL을 남은 수명으로 잡는다 — 지워진 세션 목록이 무한히 자라지
  // 않는다. 실패해도 기다리지 않는다: 로그아웃은 로컬에서 이미 끝났고,
  // 이건 그것을 넓히는 시도일 뿐이다.
  const remainingSec = Math.ceil((Number(expiresStr) - Date.now()) / 1000);
  if (kvEnabled && Number.isFinite(remainingSec) && remainingSec > 0) {
    void setWithTtl(`revoked:${nonce}`, '1', remainingSec);
  }
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  // 서명·만료·로컬 revoke를 먼저 본다. 대부분의 요청이 여기서 끝나므로
  // 네트워크를 타지 않는다.
  if (!verifySession(token)) return false;
  if (!kvEnabled) return true;

  // 다른 인스턴스에서 로그아웃된 세션인지 확인한다. 저장소가 대답하지
  // 못하면(`null`) 통과시킨다 — 저장소 장애로 관리자가 잠기는 것이
  // 이 위협 모델에서 더 나쁜 결과다.
  const nonce = token!.split(':')[0];
  return (await exists(`revoked:${nonce}`)) !== true;
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
