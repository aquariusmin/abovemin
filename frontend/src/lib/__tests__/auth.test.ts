import { describe, expect, it, vi, afterEach } from 'vitest';
import { signSession, verifySession, revoke, assertSameOrigin } from '@/lib/auth';

afterEach(() => vi.useRealTimers());

describe('세션 토큰', () => {
  it('직접 발급한 토큰을 받아들인다', () => {
    expect(verifySession(signSession().token)).toBe(true);
  });

  it('빈 값과 형태가 틀린 값을 거부한다', () => {
    for (const bad of [undefined, null, '', 'a:b:c', 'a:b:c:d:e']) {
      expect(verifySession(bad)).toBe(false);
    }
  });

  it('서명이 조작되면 거부한다', () => {
    const [nonce, issued, expires] = signSession().token.split(':');
    expect(verifySession(`${nonce}:${issued}:${expires}:${'0'.repeat(64)}`)).toBe(false);
  });

  it('만료 시각을 뒤로 미뤄도 통하지 않는다', () => {
    // 서명이 payload 전체에 걸려 있으므로 만료만 늘릴 수 없어야 한다.
    const [nonce, issued, expires, sig] = signSession().token.split(':');
    const later = String(Number(expires) + 86_400_000);
    expect(verifySession(`${nonce}:${issued}:${later}:${sig}`)).toBe(false);
  });

  it('시간이 지나면 만료된다', () => {
    const { token } = signSession();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 9 * 60 * 60 * 1000); // 세션은 8시간
    expect(verifySession(token)).toBe(false);
  });

  it('로그아웃한 토큰은 다시 쓸 수 없다', () => {
    const { token } = signSession();
    expect(verifySession(token)).toBe(true);
    revoke(token);
    expect(verifySession(token)).toBe(false);
  });

  it('매번 다른 nonce를 쓴다', () => {
    // 같으면 한 번의 로그아웃이 이후 모든 세션을 죽인다.
    const a = signSession().token.split(':')[0];
    const b = signSession().token.split(':')[0];
    expect(a).not.toBe(b);
  });
});

describe('assertSameOrigin()', () => {
  const req = (headers: Record<string, string>) => new Request('https://abovemin.com/api/x', { headers });

  it('같은 호스트에서 온 요청만 통과시킨다', () => {
    expect(assertSameOrigin(req({ origin: 'https://abovemin.com', host: 'abovemin.com' }))).toBe(true);
    expect(assertSameOrigin(req({ origin: 'https://evil.example', host: 'abovemin.com' }))).toBe(false);
  });

  it('헤더가 없거나 깨진 요청을 거부한다', () => {
    expect(assertSameOrigin(req({ host: 'abovemin.com' }))).toBe(false);
    expect(assertSameOrigin(req({ origin: 'not-a-url', host: 'abovemin.com' }))).toBe(false);
  });

  it('호스트 접두사가 같다고 통과시키지 않는다', () => {
    // abovemin.com.evil.example 같은 형태.
    expect(
      assertSameOrigin(req({ origin: 'https://abovemin.com.evil.example', host: 'abovemin.com' })),
    ).toBe(false);
  });
});
