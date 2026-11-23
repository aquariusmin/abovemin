-- 로그아웃한 관리자 세션의 nonce. 서버리스 인스턴스가 서로의 로그아웃을 알 수
-- 있게 한다(`frontend/src/lib/admin/session-revocation.ts`). 행은 토큰 만료 시각까지만
-- 의미가 있고, 로그아웃할 때 만료된 행을 함께 지운다.
--
-- RLS를 켜고 정책을 두지 않는다: anon·authenticated는 읽지도 쓰지도 못하고,
-- service role(서버)만 쓴다. 다른 파일에 의존하지 않고, 다시 돌려도 안전하다.
--
-- 적용 전에도 사이트는 동작한다: 테이블이 없으면 인스턴스 메모리의 폐기 목록만
-- 쓴다(예전과 같다).
--
-- 되돌리기: drop table if exists public.admin_revoked_sessions;
create table if not exists public.admin_revoked_sessions (
  nonce text primary key,
  expires_at timestamptz not null
);

create index if not exists admin_revoked_sessions_expires_at_idx
  on public.admin_revoked_sessions (expires_at);

alter table public.admin_revoked_sessions enable row level security;
