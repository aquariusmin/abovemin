/**
 * 가격 표시.
 *
 * 0원은 "무료"가 아니라 "아직 정해지지 않음"이다. 지금 카탈로그의 상품이 전부
 * 그 상태인데(가격 미정 · 품절 자리표시자) 상세 페이지는 `₩ 0`을 큰 글씨로
 * 보여주고 있었다. 숫자 0은 가격 자리에서 명확한 주장을 하므로, 값이 없을 때는
 * 숫자 대신 그 사실을 적는다.
 *
 * 합계처럼 여러 값을 더한 결과에는 쓰지 않는다 — 거기서 0은 "비어 있음"이라는
 * 다른 뜻이고, 애초에 값이 없는 상품은 장바구니에 담기지 않는다(품절이므로).
 */
export const PRICE_TBD = '가격 미정';

export function formatPrice(krw: number): string {
  // `\u00a0`: 줄바꿈 없는 공백. "₩"만 윗줄에 남지 않게(DESIGN.md § Line Breaking).
  return krw > 0 ? `₩\u00a0${krw.toLocaleString()}` : PRICE_TBD;
}

/**
 * 옵션마다 가격이 다른 상품의 가격 한 줄. 값이 하나면 그 값, 여럿이면
 * "₩ 32,000부터". 최고가까지 적은 범위("₩ 32,000 – ₩ 58,000")는 카드 폭에서
 * 두 줄로 꺾이고, 방문자가 먼저 묻는 것은 "얼마부터인가"다.
 */
export function formatPriceRange({ min, max }: { min: number; max: number }): string {
  if (min <= 0) return PRICE_TBD;
  return max > min ? `${formatPrice(min)}부터` : formatPrice(min);
}
