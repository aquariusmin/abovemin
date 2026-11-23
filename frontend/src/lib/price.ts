// 0원은 "무료"가 아니라 "가격 미정"이다. 합계에는 쓰지 않는다.
export const PRICE_TBD = '가격 미정';

export function formatPrice(krw: number): string {
  // `\u00a0`: "₩"만 윗줄에 남지 않게 하는 줄바꿈 없는 공백.
  return krw > 0 ? `₩\u00a0${krw.toLocaleString()}` : PRICE_TBD;
}

export function formatPriceRange({ min, max }: { min: number; max: number }): string {
  if (min <= 0) return PRICE_TBD;
  return max > min ? `${formatPrice(min)}부터` : formatPrice(min);
}
