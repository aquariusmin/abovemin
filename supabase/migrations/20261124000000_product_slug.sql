-- 순서: shop_ready(20260917020000) 다음. 그 뒤 파일들과는 순서 무관.
--
-- 상품 상세 주소를 숫자 id 대신 읽을 수 있는 이름으로: /shop/1 → /shop/2027-calendar.
-- 상품 이름에서 만들지 않고 따로 둔다 — 이름을 고쳐도 공유된 주소가 깨지지 않게.
--
-- 추가만 한다. 적용 전 코드는 slug가 없으면 /shop/<id>를 쓰고(`productPath`),
-- 적용 후에는 /shop/<id>로 들어오면 /shop/<slug>로 영구 이동한다(이미 공유된 링크).
-- 주문·장바구니는 계속 숫자 id를 쓴다.
--
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 실행. 다시 돌려도 안전하다.
--
-- 되돌리기(코드를 이전 배포로 되돌린 뒤):
--   drop index if exists public.products_slug_key;
--   alter table public.products drop constraint if exists products_slug_format;
--   alter table public.products drop column if exists slug;

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'slug'
  ) then
    alter table public.products add column slug text;
    -- 첫 값: 2027 탁상달력. 컬럼을 처음 만들 때만 — 다시 돌려도 관리자가 바꾼 값을 되돌리지 않는다.
    update public.products set slug = '2027-calendar' where id = 1;
  end if;
end $$;

-- 소문자·숫자·하이픈, 글자가 하나는 있어야 한다(숫자만이면 /shop/<id>와 헷갈린다), 60자 이하.
-- 같은 규칙이 관리 API(`lib/product.ts`의 `SLUG_RE`)에도 있다.
alter table public.products drop constraint if exists products_slug_format;
alter table public.products add constraint products_slug_format check (
  slug is null
  or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug ~ '[a-z]' and char_length(slug) <= 60)
);

-- null은 여러 개 둘 수 있다(주소를 안 정한 상품은 /shop/<id>).
create unique index if not exists products_slug_key on public.products (slug);

commit;
