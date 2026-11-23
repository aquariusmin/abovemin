-- 주문의 수령 방법: 택배(parcel) 또는 대면 전달(pickup). 다른 파일에 의존하지
-- 않고(20261123000000_orders_email_optional과도 순서 무관), 추가만 하고, 다시
-- 돌려도 안전하다. backfill 없음 — 기존 행은 null이고 null은 택배로 읽는다
-- (그때까지의 주문은 전부 택배였다. `lib/delivery.ts`의 `deliveryMethodFromRow`).
--
-- 대면 전달 주문은 주소를 받지 않는다. `orders.address`는 NOT NULL 그대로 두고
-- 빈 문자열을 넣는다.
--
-- 코드가 먼저 배포돼도 주문은 받는다: insert가 컬럼이 없다는 오류(PGRST204/42703)를
-- 받으면 컬럼 없이 다시 넣고, 대면 전달은 메모 앞에 "[대면 전달]"을 붙여 남긴다.
-- 관리 화면·CSV·운영자 메일은 그 표시도 대면 전달로 읽는다.
--
-- 되돌리기(코드를 먼저 이전 배포로 되돌린 뒤):
--   alter table public.orders drop constraint if exists orders_delivery_method_check;
--   alter table public.orders drop column if exists delivery_method;
alter table public.orders add column if not exists delivery_method text;

alter table public.orders drop constraint if exists orders_delivery_method_check;
alter table public.orders
  add constraint orders_delivery_method_check
  check (delivery_method is null or delivery_method in ('parcel', 'pickup'));
