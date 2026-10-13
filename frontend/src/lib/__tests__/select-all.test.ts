import { describe, expect, it } from 'vitest';
import { selectAll } from '@/lib/select-all';

/** `total`행짜리 테이블. 서버 상한(`cap`)이 있으면 한 번에 그만큼만 돌려준다. */
function table(total: number, cap = Infinity) {
  const calls: Array<[number, number]> = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + cap, total);
    const data = Array.from({ length: Math.max(0, end - from) }, (_, i) => from + i);
    return { data, error: null };
  };
  return { fetchPage, calls };
}

describe('selectAll', () => {
  it('reads past a single page', async () => {
    const { fetchPage } = table(2500);
    const result = await selectAll(fetchPage, 1000);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2500);
    expect(new Set(result.data).size).toBe(2500);
  });

  it('does not stop at a short page when the server cap is below the page size', async () => {
    // 상한 300, 요청 1000: 매 쪽이 "짧게" 온다. 짧다고 멈추면 300행에서 끝난다.
    const { fetchPage } = table(950, 300);
    const result = await selectAll(fetchPage, 1000);
    expect(result.data).toHaveLength(950);
  });

  it('advances by the number of rows actually received', async () => {
    const { fetchPage, calls } = table(700, 300);
    await selectAll(fetchPage, 1000);
    expect(calls.map(([from]) => from)).toEqual([0, 300, 600, 700]);
  });

  it('returns an empty list for an empty table', async () => {
    const { fetchPage, calls } = table(0);
    const result = await selectAll(fetchPage);
    expect(result).toEqual({ data: [], error: null });
    expect(calls).toHaveLength(1);
  });

  it('treats null data as the end', async () => {
    const result = await selectAll(async () => ({ data: null, error: null }));
    expect(result).toEqual({ data: [], error: null });
  });

  it('returns the error and no partial rows when a later page fails', async () => {
    const boom = new Error('boom');
    let n = 0;
    const result = await selectAll(async (from: number) => {
      n += 1;
      return n === 1 ? { data: [from], error: null } : { data: null, error: boom };
    }, 1);
    expect(result).toEqual({ data: null, error: boom });
  });
});
