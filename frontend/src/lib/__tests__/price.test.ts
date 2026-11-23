import { describe, expect, it } from 'vitest';
import { formatPrice, formatPriceRange, PRICE_TBD } from '@/lib/price';
import { isAvailable } from '@/lib/product';

describe('formatPrice()', () => {
  it('원화 기호와 숫자를 줄바꿈 없는 공백으로 묶는다', () => {
    // ₩ 뒤는 일부러 &nbsp;다 — 일반 공백으로 "정리"하지 않는다.
    expect(formatPrice(18000)).toBe('₩ 18,000');
  });

  it('0원을 "무료"로 보여주지 않는다', () => {
    expect(formatPrice(0)).toBe(PRICE_TBD);
    expect(formatPrice(-1)).toBe(PRICE_TBD);
  });
});

describe('isAvailable()', () => {
  it('재고와 가격이 둘 다 있어야 판매 중이다', () => {
    expect(isAvailable({ in_stock: true, price: 12000 })).toBe(true);
    expect(isAvailable({ in_stock: true, price: 0 })).toBe(false);
    expect(isAvailable({ in_stock: false, price: 12000 })).toBe(false);
  });
});

describe('formatPriceRange()', () => {
  it('값이 하나면 그 가격, 여럿이면 최저가부터', () => {
    expect(formatPriceRange({ min: 38000, max: 38000 })).toBe('₩\u00a038,000');
    expect(formatPriceRange({ min: 38000, max: 58000 })).toBe('₩\u00a038,000부터');
  });

  it('가격이 정해진 옵션이 없으면 가격 미정', () => {
    expect(formatPriceRange({ min: 0, max: 0 })).toBe(PRICE_TBD);
  });
});
