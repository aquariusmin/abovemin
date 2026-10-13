---
paths:
  - "frontend/src/app/shop/**"
  - "frontend/src/app/cart/**"
  - "frontend/src/app/api/orders/**"
  - "frontend/src/components/shop/**"
  - "frontend/src/components/AddToCartButton.tsx"
  - "frontend/src/store/cartStore.ts"
  - "frontend/src/lib/order-*.ts"
  - "frontend/src/lib/orders-schema.ts"
  - "frontend/src/lib/cart-lines.ts"
  - "frontend/src/lib/product.ts"
  - "frontend/src/lib/price.ts"
---

# Shop · 주문

주문은 `POST /api/orders` 하나로 들어온다. 아래는 깨지면 돈이나 개인정보 사고가 되는 불변식이다.

- **가격은 서버가 다시 계산한다.** 요청 본문에 가격 필드가 없고(`orders-schema.ts` — 줄마다 상품 id, 옵션 id 또는 추가 상품 id, 수량뿐이다), `resolveOrderItems`(`lib/order-items.ts`)가 DB의 상품·옵션·추가 상품에서 금액을 만든다. 클라이언트가 보낸 금액을 믿는 경로를 만들지 않는다.
- **추가 상품 줄은 혼자 주문되지 않는다.** 같은 주문에 부모 상품의 줄이 있고, 부모가 살 수 있는 상태이고, 추가 상품이 `products.addons`에 재고와 가격을 가지고 있을 때만 받는다. 이 판단도 `resolveOrderItems`가 DB 값으로 한다 — 장바구니가 부모 없는 추가 상품 줄을 지우는 것은 편의이지 방어가 아니다.
- **중복 제출은 `idempotency_key`로 한 건이 된다.** 조회 → insert → 유니크 위반이면 다시 조회. 이 순서를 바꾸지 않는다.
- **제한은 셋이다**: IP당, 수신 이메일당, 구매자 메일 전체. 전부 `rateLimitShared` — 인메모리 `rateLimit`은 서버리스에서 인스턴스마다 따로 센다.
- **허니팟**(`website` 필드, `isHoneypotFilled`)을 지우지 않는다.
- 판매 가능 여부는 `lib/product.ts`의 `productStatus`/`isAvailable`로만 판단한다. `in_stock`·`image_url`·`price`는 호환용 컬럼이고 서버가 맞춘다.
- 주문 메일(`lib/order-email.ts`)은 사용자 입력을 `escapeHtml`로 거른다. 계좌 정보는 `BANK_INFO` 환경변수에서만 온다 — 코드에 적지 않는다.

## 확인할 때

- 로컬 dev 서버는 운영 Supabase와 Resend를 쓴다. 체크아웃을 **제출하면 실제 주문이 생기고 메일이 나간다.** 제출 전까지만 확인하고, 제출이 필요하면 먼저 승인을 받는다(`shop-flow-check` 스킬).
- 로직 변경에는 `src/lib/__tests__/`의 해당 테스트(`order-items`, `orders-schema`, `cart-lines`, `price`, `product`, `order-email`)를 같이 고친다.
- 체크아웃 폼은 모바일이 기준이다: `type`/`inputMode`/`autoComplete`, 터치 타깃, 오류 문구가 입력 옆에 보이는지.
