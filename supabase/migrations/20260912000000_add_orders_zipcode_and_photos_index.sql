-- ⚠️ 이 마이그레이션은 배포 **전에** 적용해야 한다.
--
-- `api/orders`가 이제 insert에 `zipcode`를 포함한다. 컬럼이 없는 상태로
-- 배포하면 모든 주문이 실패한다. 적용 방법은 아래 셋 중 하나:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일
--
-- ── 1. orders.zipcode ────────────────────────────────────────────────────────
-- 체크아웃 폼은 처음부터 우편번호를 입력받아 서버로 보내고 있었지만, zod
-- 스키마에 필드가 없어 조용히 버려졌고 저장할 컬럼도 없었다. 실물 배송에
-- 필요한 값이다. nullable로 두는 이유: 폼에서도 선택 항목이고, 이미 들어온
-- 주문(현재 0건)을 막지 않기 위해서다.
alter table public.orders add column if not exists zipcode text;

-- ── 2. photos(album_slug, sort_order) 인덱스 ─────────────────────────────────
-- 아카이브의 모든 조회가 `where album_slug = ? order by sort_order` 형태인데
-- FK에 커버링 인덱스가 없어 매번 순차 스캔이었다(Supabase advisor
-- `unindexed_foreign_keys`). 지금은 290행이라 체감되지 않지만, 정렬까지
-- 인덱스로 처리되므로 앨범이 커질수록 이득이 커진다.
create index if not exists photos_album_slug_sort_order_idx
  on public.photos (album_slug, sort_order);
