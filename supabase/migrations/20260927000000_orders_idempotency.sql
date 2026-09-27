-- 적용 순서는 상관없다 — 코드가 먼저 나가도 주문은 받는다.
--
-- `api/orders`는 `idempotency_key` 컬럼이 없으면(`42703`/`PGRST204`) 예전처럼
-- 키 없이 insert한다(`lib/db-compat.ts`의 `withColumnFallback`). 이 파일을
-- 적용해야 "같은 주문 두 번"을 막는 경로가 켜진다. 적용 방법:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일
--
-- ── 1. orders.idempotency_key ────────────────────────────────────────────────
-- 체크아웃은 주문 시도마다 UUID를 하나 만들고, 같은 제출을 다시 보낼 때(응답을
-- 못 받고 버튼을 또 누른 경우, 네트워크 재시도)도 같은 값을 보낸다. 서버는 이
-- 키로 이미 들어온 주문을 찾으면 새로 넣지 않고 그 주문으로 답한다 — 계좌이체
-- 주문이 두 번 들어가면 손님은 입금 안내를 두 통 받고 어느 쪽에 넣을지 모른다.
--
-- nullable: 이미 들어온 주문과 키 없이 오는 요청(구버전 탭)을 막지 않는다.
-- 유니크는 null이 아닌 값에만 건다(partial). 동시에 들어온 두 요청이 둘 다
-- 조회를 통과해도, 둘째 insert가 여기서 23505로 막히고 라우트가 첫째 주문으로
-- 답한다.
alter table public.orders add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
-- 프로덕션에서는 이미 켜져 있다. 여기 적는 것은 기록을 위해서다 — 저장소의
-- 마이그레이션만 보고 새 DB를 세우면 orders가 anon 키로 읽히는 상태가 된다.
--
-- anon/authenticated 정책은 **일부러 하나도 두지 않는다.** 주문의 읽기·쓰기는
-- 전부 서버 라우트가 service role로 한다(`lib/supabase-admin.ts`) — service
-- role은 RLS를 건너뛴다. 정책이 없으면 공개 키로는 행이 하나도 보이지 않는다.
-- 손님의 이름·주소·연락처가 담긴 표다.
alter table public.orders enable row level security;
