-- 적용 순서는 상관없다 — 코드가 먼저 나가도 주문과 로그인은 그대로 된다.
--
-- `lib/rate-limit.ts`의 `rateLimitShared()`는 이 함수가 없으면(`PGRST202`/
-- `42883`) 경고를 한 번 남기고 예전처럼 인스턴스별 in-memory로 센다. 이 파일을
-- 적용해야 "공유" 제한이 실제로 인스턴스를 넘어 공유된다. 적용 방법:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일
--
-- 왜 Postgres인가: 프로덕션에는 Upstash가 없어서, 주문 API의 IP·이메일별 제한,
-- 구매자 메일 전체 한도, 관리자 로그인 시도 제한이 전부 "서버리스 인스턴스당"
-- 이었다. 이미 붙어 있는 Supabase로 세면 저장소를 하나 더 늘리지 않아도 된다.
-- 호출량은 주문·로그인 몇 번 수준이라 행 하나 upsert가 부담이 되지 않는다.

-- ── 1. 표 ────────────────────────────────────────────────────────────────────
-- 키 하나에 행 하나. 고정 창(fixed window) 카운터: 창이 끝난 뒤 첫 요청이
-- count를 1로, reset_at을 새 창 끝으로 되돌린다.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- 만료된 행 정리(아래 함수)가 순차 스캔을 하지 않게.
create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
-- 정책은 **일부러 하나도 두지 않는다.** 이 표를 만지는 것은 서버 라우트가
-- service role로 부르는 `rate_limit_hit()`뿐이다. 정책이 없으면 공개 키로는
-- 행이 하나도 보이지 않고 쓸 수도 없다 — 키에 손님 이메일과 IP가 들어간다.
-- 공개 키로 카운터를 지우거나 부풀릴 수 있으면 제한이 의미가 없다.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- ── 3. rate_limit_hit ────────────────────────────────────────────────────────
-- 한 번 부를 때마다 1을 세고, 이번 요청이 한도 안인지 돌려준다.
--
-- 원자성: insert … on conflict do update 한 문장이다. 같은 키로 동시에 들어온
-- 요청은 행 잠금에서 줄을 서므로 "읽고 → 더하고 → 쓰는" 사이에 끼어들 틈이
-- 없다. `do update set`의 오른쪽 `rl.*`는 갱신 **전** 값이다.
--
-- `security definer` + `set search_path = ''`: 호출자의 search_path가 함수
-- 본문이 가리키는 객체를 바꾸지 못하게 고정하고(advisor
-- function_search_path_mutable), 이름은 전부 스키마까지 적는다. `now()`와
-- `random()`은 pg_catalog라 빈 search_path에서도 찾힌다.
--
-- `#variable_conflict use_column`: 반환 열 이름 `reset_at`이 표의 열 이름과
-- 같다. 문장 안에서 겹치는 이름은 열로 읽는다(그래도 전부 별칭을 붙였다).
create or replace function public.rate_limit_hit(p_key text, p_window_ms integer, p_limit integer)
returns table (ok boolean, remaining integer, reset_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_count integer;
  v_reset timestamptz;
begin
  if p_key is null or p_window_ms is null or p_window_ms <= 0 or p_limit is null or p_limit < 0 then
    raise exception 'rate_limit_hit: invalid arguments' using errcode = '22023';
  end if;

  insert into public.rate_limits as rl (key, count, reset_at)
  values (p_key, 1, now() + p_window_ms * interval '1 millisecond')
  on conflict (key) do update set
    count = case when rl.reset_at <= now() then 1 else rl.count + 1 end,
    reset_at = case when rl.reset_at <= now() then excluded.reset_at else rl.reset_at end
  returning rl.count, rl.reset_at into v_count, v_reset;

  -- 가끔(약 1%) 만료된 행을 치운다. 한 번에 최대 500행, 다른 요청이 잡고 있는
  -- 행은 건너뛴다 — 청소 때문에 주문 요청이 기다리는 일은 없어야 한다.
  -- 방금 센 행은 reset_at이 미래라 지워지지 않는다.
  if random() < 0.01 then
    delete from public.rate_limits as d
    where d.key in (
      select s.key
      from public.rate_limits as s
      where s.reset_at < now()
      limit 500
      for update skip locked
    );
  end if;

  ok := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  reset_at := v_reset;
  return next;
end;
$$;

-- 기본으로 public에 열리는 execute를 거둔다. service role만 부른다.
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
