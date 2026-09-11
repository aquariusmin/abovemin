import { describe, expect, it } from 'vitest';
import { formatPrice, PRICE_TBD } from '@/lib/price';

describe('formatPrice()', () => {
  it('원화 기호와 숫자를 줄바꿈 없는 공백으로 묶는다', () => {
    // 일반 공백이면 좁은 칸에서 "₩"만 윗줄에 남는다. 원래 마크업의
    // `₩&nbsp;`를 그대로 옮긴 것이라, 평범한 공백으로 "정리"하면 안 된다.
    expect(formatPrice(18000)).toBe('₩ 18,000');
  });

  it('0원을 "무료"로 보여주지 않는다', () => {
    // 가격이 정해지지 않은 상품이 ₩ 0으로 나오고 있었다.
    expect(formatPrice(0)).toBe(PRICE_TBD);
    expect(formatPrice(-1)).toBe(PRICE_TBD);
  });
});
