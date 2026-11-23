import { describe, expect, it } from 'vitest';
import { isWinterDecor } from '@/lib/season';

describe('isWinterDecor', () => {
  it('11월 23일부터 12월 31일 끝(한국 시간)까지만 켜진다', () => {
    expect(isWinterDecor(new Date('2026-11-22T23:59:59+09:00'))).toBe(false);
    expect(isWinterDecor(new Date('2026-11-23T00:00:00+09:00'))).toBe(true);
    expect(isWinterDecor(new Date('2026-12-25T12:00:00+09:00'))).toBe(true);
    expect(isWinterDecor(new Date('2026-12-31T23:59:59+09:00'))).toBe(true);
    expect(isWinterDecor(new Date('2027-01-01T00:00:00+09:00'))).toBe(false);
  });
});
