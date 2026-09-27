import { describe, expect, it } from 'vitest';
import { tabKeyTarget } from '@/lib/admin/tab-keys';

describe('tabKeyTarget', () => {
  it('←/→는 한 칸씩, 양 끝에서는 반대쪽으로 돈다', () => {
    expect(tabKeyTarget('ArrowRight', 0, 7)).toBe(1);
    expect(tabKeyTarget('ArrowRight', 6, 7)).toBe(0);
    expect(tabKeyTarget('ArrowLeft', 3, 7)).toBe(2);
    expect(tabKeyTarget('ArrowLeft', 0, 7)).toBe(6);
  });

  it('Home/End는 처음과 끝', () => {
    expect(tabKeyTarget('Home', 4, 7)).toBe(0);
    expect(tabKeyTarget('End', 1, 7)).toBe(6);
  });

  it('다른 키와 빈 목록은 null', () => {
    expect(tabKeyTarget('ArrowDown', 2, 7)).toBeNull();
    expect(tabKeyTarget('Enter', 2, 7)).toBeNull();
    expect(tabKeyTarget('ArrowRight', 0, 0)).toBeNull();
  });
});
