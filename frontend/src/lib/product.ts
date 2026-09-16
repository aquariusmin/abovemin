/**
 * "살 수 있는 상품"의 정의.
 *
 * 카탈로그의 세 상품은 전부 `price = 0`, `in_stock = false`인 자리표시자다.
 * 그런데 화면마다 그 상태를 다르게 읽고 있었다 — 홈은 "이번 달 새로 나온
 * 소품"에 `₩ 0`을 걸고, 목록은 "가격 미정", 상세는 "Sold out"과 "Out of
 * Stock", 카드 버튼은 "품절". 같은 사실을 네 가지로 말하면 방문자는 네 가지
 * 다른 상태로 읽는다.
 *
 * 재고만으로는 부족하다: 가격이 0인 채로 `in_stock`만 켜지면 ₩0짜리 주문이
 * 들어갈 수 있다. 둘 다 갖춰야 판매 중이다.
 */
export interface Sellable {
  price: number;
  in_stock: boolean;
}

export function isAvailable(product: Sellable): boolean {
  return product.in_stock && product.price > 0;
}

/**
 * 판매 중이 아닌 상품의 상태 문구 — 배지와 비활성 버튼이 같은 말을 한다.
 *
 * "품절"이 아니다. 품절은 "팔다가 다 떨어졌다"는 주장인데, 지금 상품들은
 * 한 번도 판 적이 없다.
 */
export const UNAVAILABLE_LABEL = '준비 중';
