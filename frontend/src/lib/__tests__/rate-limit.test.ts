import { describe, expect, it, vi, afterEach } from 'vitest';
import { rateLimit, clientIp } from '@/lib/rate-limit';

afterEach(() => vi.useRealTimers());

const key = () => `test:${Math.random()}`;

describe('rateLimit()', () => {
  it('한도까지 허용하고 그 다음을 막는다', () => {
    const k = key();
    const opts = { limit: 3, windowMs: 60_000 };
    expect([1, 2, 3].map(() => rateLimit(k, opts).ok)).toEqual([true, true, true]);
    expect(rateLimit(k, opts).ok).toBe(false);
  });

  it('남은 횟수를 0 아래로 보고하지 않는다', () => {
    const k = key();
    const opts = { limit: 1, windowMs: 60_000 };
    rateLimit(k, opts);
    rateLimit(k, opts);
    expect(rateLimit(k, opts).remaining).toBe(0);
  });

  it('키가 다르면 서로 영향이 없다', () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const a = key();
    rateLimit(a, opts);
    expect(rateLimit(a, opts).ok).toBe(false);
    expect(rateLimit(key(), opts).ok).toBe(true);
  });

  it('창이 지나면 초기화된다', () => {
    const k = key();
    const opts = { limit: 1, windowMs: 1_000 };
    expect(rateLimit(k, opts).ok).toBe(true);
    expect(rateLimit(k, opts).ok).toBe(false);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 1_500);
    expect(rateLimit(k, opts).ok).toBe(true);
  });
});

describe('clientIp()', () => {
  const req = (headers: Record<string, string>) => new Request('https://x/', { headers });

  it('x-real-ip를 먼저 본다', () => {
    // Vercel 엣지가 넣는 값이고 클라이언트가 위조할 수 없다. x-forwarded-for는
    // 클라이언트가 앞에 덧붙일 수 있으므로 우선순위가 낮다.
    expect(clientIp(req({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.1.1.1');
  });

  it('x-real-ip가 없으면 x-forwarded-for의 첫 값을 쓴다', () => {
    expect(clientIp(req({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
  });

  it('아무것도 없으면 unknown', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});

describe('rateLimitShared() — 저장소가 없을 때', () => {
  it('in-memory 리미터와 똑같이 동작한다', async () => {
    // Upstash 변수가 없으면 공유 경로는 조용히 로컬로 되돌아가야 한다.
    // 설정하지 않은 배포에서 아무것도 달라지지 않는다는 것이 요점이다.
    const { rateLimitShared } = await import('@/lib/rate-limit');
    const k = key();
    const opts = { limit: 2, windowMs: 60_000 };
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(false);
  });
});
