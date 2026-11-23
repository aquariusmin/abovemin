import { describe, expect, it, vi } from 'vitest';
import { isRevoked, recordRevocation, type RevocationDb } from '@/lib/admin/session-revocation';

function fakeDb(opts: { readError?: unknown; writeError?: unknown; rows?: Set<string> } = {}) {
  const rows = opts.rows ?? new Set<string>();
  const db: RevocationDb = {
    from: () => ({
      upsert: row => {
        if (!opts.writeError) rows.add(row.nonce);
        return Promise.resolve({ error: opts.writeError ?? null });
      },
      delete: () => ({ lt: () => Promise.resolve({ error: null }) }),
      select: () => ({
        eq: (_c, nonce) => ({
          maybeSingle: () =>
            Promise.resolve(opts.readError ? { data: null, error: opts.readError } : { data: rows.has(nonce) ? { nonce } : null, error: null }),
        }),
      }),
    }),
  };
  return { db, rows };
}

const MISSING_TABLE = { code: '42P01', message: 'relation "admin_revoked_sessions" does not exist' };

describe('session revocation', () => {
  it('기록한 nonce는 다른 인스턴스에서도 폐기된 것으로 읽힌다', async () => {
    const { db } = fakeDb();
    await recordRevocation(db, 'abc', Date.now() + 60_000);
    expect(await isRevoked(db, 'abc')).toBe(true);
    expect(await isRevoked(db, 'other')).toBe(false);
  });

  it('테이블이 아직 없으면(마이그레이션 전) 폐기되지 않은 것으로 본다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await isRevoked(fakeDb({ readError: MISSING_TABLE }).db, 'abc')).toBe(false);
    await expect(recordRevocation(fakeDb({ writeError: MISSING_TABLE }).db, 'abc', Date.now() + 1)).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it('다른 오류로 확인할 수 없으면 세션을 받아들이지 않는다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await isRevoked(fakeDb({ readError: { code: '08006', message: 'connection failure' } }).db, 'abc')).toBe(true);
    error.mockRestore();
  });
});
