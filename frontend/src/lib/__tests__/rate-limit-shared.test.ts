import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 이 파일이 지키는 것: `rateLimitShared()`는 Upstash → Postgres → in-memory
 * 순으로 저장소를 고르고, 어느 저장소가 실패해도 **던지지 않는다.** 레이트
 * 리미터 때문에 주문이나 로그인이 500을 내면 안 된다.
 */
const h = vi.hoisted(() => ({
  kvEnabled: false,
  incrementWithTtl: vi.fn<(key: string, ttl: number) => Promise<number | null>>(),
  rpc: vi.fn(),
  adminThrows: false,
  warn: vi.fn(),
}));

vi.mock('@/lib/kv', () => ({
  get kvEnabled() {
    return h.kvEnabled;
  },
  incrementWithTtl: h.incrementWithTtl,
}));

vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: h.warn, error: vi.fn() },
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    if (h.adminThrows) throw new Error('Supabase admin configuration is missing');
    return {
      rpc: (...args: unknown[]) => ({
        abortSignal: () => h.rpc(...args),
      }),
    };
  },
}));

// 모듈 안의 상태(경고 한 번, 함수 없음 백오프)를 테스트마다 새로 시작한다.
async function load() {
  vi.resetModules();
  return (await import('@/lib/rate-limit')).rateLimitShared;
}

const key = () => `test:${Math.random()}`;
const opts = { limit: 2, windowMs: 60_000 };
const pgRow = (ok: boolean, remaining: number) => ({
  data: [{ ok, remaining, reset_at: '2026-09-28T00:01:00+00:00' }],
  error: null,
});

beforeEach(() => {
  h.kvEnabled = false;
  h.adminThrows = false;
  h.incrementWithTtl.mockReset();
  h.rpc.mockReset();
  h.warn.mockReset();
});

describe('rateLimitShared() — 저장소 순서', () => {
  it('Upstash가 있으면 그걸로 세고 Postgres는 부르지 않는다', async () => {
    h.kvEnabled = true;
    h.incrementWithTtl.mockResolvedValue(3);
    const rateLimitShared = await load();
    const r = await rateLimitShared(key(), opts);
    expect(r).toMatchObject({ ok: false, remaining: 0 });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('Upstash가 실패하면 Postgres로 넘어간다', async () => {
    h.kvEnabled = true;
    h.incrementWithTtl.mockResolvedValue(null);
    h.rpc.mockResolvedValue(pgRow(true, 1));
    const rateLimitShared = await load();
    expect((await rateLimitShared(key(), opts)).ok).toBe(true);
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });

  it('Upstash가 없으면 Postgres 함수의 결과를 그대로 돌려준다', async () => {
    h.rpc.mockResolvedValue(pgRow(false, 0));
    const rateLimitShared = await load();
    const k = key();
    const r = await rateLimitShared(k, opts);
    expect(r).toEqual({ ok: false, remaining: 0, resetAt: Date.parse('2026-09-28T00:01:00Z') });
    expect(h.rpc).toHaveBeenCalledWith('rate_limit_hit', {
      p_key: k,
      p_window_ms: 60_000,
      p_limit: 2,
    });
  });

  it('둘 다 없으면 in-memory 리미터와 똑같이 동작한다', async () => {
    // 설정하지 않은 로컬 개발에서 아무것도 달라지지 않는다는 것이 요점이다.
    h.adminThrows = true;
    const rateLimitShared = await load();
    const k = key();
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(false);
  });
});

describe('rateLimitShared() — Postgres 오류', () => {
  it('함수가 없으면(PGRST202) in-memory로 세고, 경고는 한 번, 잠시 Postgres를 건너뛴다', async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.rate_limit_hit' },
    });
    const rateLimitShared = await load();
    const k = key();
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(false);
    // 마이그레이션 전에 매 요청마다 왕복 하나를 버리지 않는다.
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.warn).toHaveBeenCalledTimes(1);
    expect(h.warn.mock.calls[0][0]).toBe('rate_limit.pg.migration_pending');
  });

  it('Postgres 코드 42883도 함수 없음으로 본다', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'function does not exist' } });
    const rateLimitShared = await load();
    expect((await rateLimitShared(key(), opts)).ok).toBe(true);
    expect(h.warn.mock.calls[0][0]).toBe('rate_limit.pg.migration_pending');
  });

  it('다른 오류는 in-memory로 내려가되 다음 요청에서 다시 시도한다', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'canceling statement' } });
    const rateLimitShared = await load();
    const k = key();
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect((await rateLimitShared(k, opts)).ok).toBe(true);
    expect(h.rpc).toHaveBeenCalledTimes(2);
    expect(h.warn).toHaveBeenCalledTimes(1);
  });

  it('네트워크 예외(타임아웃 포함)를 던지지 않고 in-memory로 내려간다', async () => {
    h.rpc.mockRejectedValue(new Error('fetch failed'));
    const rateLimitShared = await load();
    const k = key();
    await expect(rateLimitShared(k, { limit: 1, windowMs: 60_000 })).resolves.toMatchObject({ ok: true });
    await expect(rateLimitShared(k, { limit: 1, windowMs: 60_000 })).resolves.toMatchObject({ ok: false });
    expect(h.warn).toHaveBeenCalledTimes(1);
    expect(h.warn.mock.calls[0][0]).toBe('rate_limit.pg.unreachable');
  });

  it('응답 모양이 이상하면 믿지 않고 in-memory로 센다', async () => {
    h.rpc.mockResolvedValue({ data: [], error: null });
    const rateLimitShared = await load();
    expect((await rateLimitShared(key(), opts)).ok).toBe(true);
    expect(h.warn.mock.calls[0][0]).toBe('rate_limit.pg.bad_response');
  });
});
