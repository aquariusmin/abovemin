-- ⚠️ 적용 순서: 20260917020000_shop_ready.sql **다음에** 적용한다. 그 파일의
--    객체를 직접 참조하지는 않아서 먼저 돌려도 실패하지는 않지만, 추가 상품과
--    함께 구매는 상품의 상태(`status`)·옵션(`options`) 위에서 동작하므로 파일
--    이름 순서대로 적용하는 것을 규칙으로 둔다.
--
-- 상품에 "같이 살 것" 두 가지를 붙인다:
--   - addons      — 이 상품에만 딸린 추가 상품(달력의 거치대 +₩3,000 같은 것).
--                   따로 팔지 않고, 상품 편집기에서 바로 적는다.
--   - related_ids — 함께 구매: 상품 페이지에 같이 보여 줄 **다른 상품**의 id.
--
-- 전부 추가(additive)만 하고, 다시 돌려도 안전하고, backfill이 없다(기존 상품은
-- 둘 다 빈 배열로 시작한다). 지금 배포된 코드는 `select('*')`로 새 컬럼을 더
-- 받을 뿐이다. 반대로 코드가 먼저 배포돼도 깨지지 않는다:
--   - 공개 화면은 컬럼이 없으면 추가 상품도 함께 구매도 없는 것으로 읽는다
--     (`lib/product.ts`의 `parseAddons`·`parseRelatedIds`) — 페이지는 전과 같다.
--   - 주문 API는 `addons` 없이 상품을 다시 읽고, 추가 상품 줄이 온 주문만
--     "더 이상 판매하지 않는다"로 거절한다(400). 다른 주문은 그대로 받는다.
--   - 관리 화면은 두 칸에 "마이그레이션 적용 필요"를 띄우고, 그런 내용을
--     저장하려 하면 반쯤 저장하지 않고 409로 알린다.
--
-- 적용 방법은 아래 셋 중 하나:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일

begin;

-- ── 1. addons: 이 상품에만 딸린 추가 상품 ────────────────────────────────────
-- `[{ "id": "add-k3f9a", "label": "거치대", "price": 3000, "in_stock": true }, …]`
-- 모양과 id 형식은 `options`와 같다(영문 소문자·숫자·하이픈 1~32자). 최대 10개.
-- 옵션과 달리 **고르지 않아도 되고**, 어느 옵션을 골랐는지와 상관없이 상품에
-- 붙는다. 장바구니에서는 제 수량을 가진 별도의 줄이다.
--
-- 주문 API는 추가 상품 id를 이 배열에서 다시 찾아 이름과 가격을 읽는다 —
-- 클라이언트가 보낸 가격은 쓰지 않는다. 그리고 같은 주문에 이 상품의 줄이 하나도
-- 없으면 추가 상품만으로는 주문을 받지 않는다(`lib/order-items.ts`).
--
-- 모양 검증(개수, id 형식, 이름 길이)은 관리 API의 zod가 쥔다. DB는 "배열이다"만
-- 보장한다(`shop_ready`의 `images`·`options`와 같은 이유).
alter table public.products
  add column if not exists addons jsonb not null default '[]'::jsonb;

-- ── 2. related_ids: 함께 구매 ────────────────────────────────────────────────
-- `[12, 7, 3]` — 다른 상품의 id. 배열 순서가 화면에 보이는 순서다. 최대 6개,
-- 자기 자신과 중복은 관리 API가 막는다.
--
-- FK도 트리거도 두지 않는다. 가리키던 상품이 지워지면 그 id는 **읽을 때
-- 무시된다**(`lib/product.ts`의 `relatedProducts`) — 초안으로 내린 상품도 같은
-- 길로 빠진다. 지운 상품 하나 때문에 다른 상품 페이지가 깨지지 않는다.
alter table public.products
  add column if not exists related_ids jsonb not null default '[]'::jsonb;

-- jsonb 두 컬럼이 늘 배열이도록. 이름을 붙여 두어 다시 돌려도 중복되지 않게 한다.
alter table public.products drop constraint if exists products_addons_is_array;
alter table public.products
  add constraint products_addons_is_array check (jsonb_typeof(addons) = 'array');
alter table public.products drop constraint if exists products_related_ids_is_array;
alter table public.products
  add constraint products_related_ids_is_array check (jsonb_typeof(related_ids) = 'array');

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
-- 바꾸지 않는다. 공개 읽기 정책("public read products", `shop_ready`)은 행을
-- 거를 뿐(`status <> 'draft'`) 컬럼을 고르지 않으므로 새 컬럼도 anon에게 읽힌다.
-- 둘 다 상품 페이지에 그대로 보이는 공개 정보다.

commit;
