-- ⚠️ 적용 순서: 20260916000000_admin_studio.sql → 20260916100000_archive_extras.sql
--    **다음에** 적용한다. 앞 파일들의 객체를 직접 참조하지는 않아서 먼저
--    돌려도 실패하지는 않지만, 관리 화면의 `sort_order`와 `updated_at` 트리거가
--    앞 파일에 있으므로 파일 이름 순서대로 적용하는 것을 규칙으로 둔다.
--
-- 샵을 "자리표시자 세 개"에서 실제로 팔 수 있는 상태로 만든다:
-- 상품 상태(초안·판매 중·품절), 여러 장의 이미지, 옵션(크기·용지 등), 에디션.
--
-- 전부 추가(additive)만 한다. 지금 배포된 코드는 `select('*')`로 새 컬럼을 더
-- 받을 뿐이고, 어떤 insert/update도 새 컬럼을 요구하지 않는다(모두 기본값이
-- 있다). 반대로 코드가 먼저 배포돼도 깨지지 않는다 — 코드는 `status`가 없으면
-- 아래 backfill과 **같은 규칙**(`in_stock and price > 0`)으로 상태를 계산한다
-- (`lib/product.ts`의 `productStatus`).
--
-- 적용 방법은 아래 셋 중 하나:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일

begin;

-- ── 1. images: 상품 사진 여러 장 ─────────────────────────────────────────────
-- `[{ "url": "https://res.cloudinary.com/…", "label": "앞면" }, …]`
-- 첫 장이 커버다. `image_url`은 지우지 않고 **첫 장과 같게** 유지한다 — 주문
-- 메일·장바구니에 담긴 옛 항목·이 파일 적용 전의 코드가 모두 `image_url`만
-- 읽는다. 동기화는 관리 API가 한다(`api/admin/products`).
--
-- label은 앞면/뒷면/디테일/사용 예/기타 중 하나이거나 40자 이하 자유 입력.
-- 모양 검증(url 허용 호스트, 개수, 길이)은 관리 API의 zod가 쥔다 — jsonb 안쪽을
-- SQL check로 다 적으면 규칙이 두 곳에 생긴다. DB는 "배열이다"만 보장한다.
alter table public.products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- ── 2. options: 크기·용지 같은 선택지 ────────────────────────────────────────
-- `[{ "id": "a3-matte", "label": "A3 · 매트지", "price": 38000, "in_stock": true }, …]`
-- 옵션이 있는 상품은 **옵션의 가격**으로 판다. `products.price`는 그때 가장 싼
-- 옵션 가격으로 맞춰 두는 표시용 값이다(정렬·홈 소개·옛 코드용).
-- 주문 API는 옵션 id를 이 배열에서 다시 찾아 가격을 읽는다 — 클라이언트가 보낸
-- 가격은 쓰지 않는다.
alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb;

-- ── 3. edition: "한정 30부" 같은 한 줄 ───────────────────────────────────────
alter table public.products
  add column if not exists edition text;

-- jsonb 두 컬럼이 늘 배열이도록. 이름을 붙여 두어 다시 돌려도 중복되지 않게 한다.
alter table public.products drop constraint if exists products_images_is_array;
alter table public.products
  add constraint products_images_is_array check (jsonb_typeof(images) = 'array');
alter table public.products drop constraint if exists products_options_is_array;
alter table public.products
  add constraint products_options_is_array check (jsonb_typeof(options) = 'array');

-- ── 4. status: 초안 · 판매 중 · 품절 ─────────────────────────────────────────
--   draft     — 공개 화면 어디에도 없다. /shop/[id]도 404, sitemap에도 없다.
--   available — 살 수 있다.
--   sold_out  — 샵에 남아 "품절" 배지를 달고 보인다. 살 수는 없다.
--
-- `in_stock`은 남긴다(호환용). 관리 API가 저장할 때 `in_stock = (status =
-- 'available')`로 맞추므로 개요의 "판매 중 상품" 수와 옛 코드가 계속 맞다.
-- 상태의 원본은 이제 `status`다.
--
-- backfill은 **컬럼을 처음 만들 때만** 한다. 파일을 두 번 돌렸을 때 관리자가
-- 이미 바꿔 둔 상태를 옛 규칙으로 되돌리면 안 되기 때문이다.
--   in_stock and price > 0 → 'available', 그 밖(지금의 ₩0·품절 자리표시자) → 'draft'
-- 한 번도 판 적 없는 자리표시자를 '품절'로 두면 "팔다가 다 떨어졌다"는 거짓이
-- 된다. 그래서 'sold_out'이 아니라 'draft'다.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'status'
  ) then
    alter table public.products
      add column status text not null default 'draft'
        constraint products_status_check check (status in ('draft', 'available', 'sold_out'));
    update public.products
      set status = 'available'
      where in_stock and price > 0;
  end if;
end
$$;

-- 참고: 초안을 공개 읽기 정책(RLS)으로 막지는 않는다. products의 공개 읽기
-- 정책은 이 저장소의 마이그레이션 밖에서 만들어져 이름을 확정할 수 없고, 이름을
-- 모른 채 새 정책을 더하면 기존 `using (true)`와 OR로 합쳐져 아무것도 막지
-- 못한다. 초안은 공개 조회 코드(`lib/supabase.ts`)가 거른다. 초안에 비밀은
-- 없다 — 이름·가격·이미지뿐이다.

commit;
