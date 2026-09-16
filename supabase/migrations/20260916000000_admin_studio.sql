-- ⚠️ 적용 순서: 이 마이그레이션은 admin-studio 배포 **전에** 적용해도 되고,
--    그래야 새 관리 화면이 처음부터 모든 기능을 쓴다.
--
-- 전부 추가(additive)만 한다 — 컬럼은 기본값을 갖고 추가되고, 기존 행의 값은
-- 기본값이 채워지는 것 말고는 바뀌지 않는다. 그래서 **지금 배포된 코드**와도
-- 호환된다: `select('*')`는 새 컬럼을 더 받을 뿐이고, 어떤 insert/update도
-- 새 컬럼을 요구하지 않는다.
--
-- 반대로 코드가 먼저 배포되고 이 파일이 나중에 적용돼도 사이트는 깨지지
-- 않는다. 공개 조회(`lib/supabase.ts`)는 컬럼이 없다는 오류(42703)를 받으면
-- 필터 없이 다시 읽고, 관리 화면은 "마이그레이션 적용 필요"를 띄운다.
--
-- 적용 방법은 아래 셋 중 하나:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일
--
-- 전체를 한 트랜잭션으로 감싼다. FK를 다시 거는 구간(5번)에서 실패하면 FK가
-- 없는 상태로 남으면 안 되기 때문이다.

begin;

-- ── 1. albums ────────────────────────────────────────────────────────────────
-- `published`: 앨범을 지우지 않고 공개 목록에서 내리기 위한 스위치. 기본값
-- true라 지금 공개된 여섯 앨범은 그대로 공개로 남는다.
-- `description`: 앨범 소개. 선택 항목이라 nullable.
alter table public.albums
  add column if not exists published boolean not null default true,
  add column if not exists description text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ── 2. photos ────────────────────────────────────────────────────────────────
-- `hidden`: 사진을 지우지 않고 공개 화면에서만 뺀다. 기본값 false.
-- `created_at`: 개요의 "최근 추가된 사진". 기존 293장은 적용 시각으로 같게
-- 채워지므로, 관리 화면은 `created_at desc, id desc`로 정렬해 순서를 잡는다.
alter table public.photos
  add column if not exists hidden boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ── 3. products ──────────────────────────────────────────────────────────────
-- `sort_order`: 샵 목록 순서. 기존 행은 전부 0이 되고, 공개 조회는
-- `sort_order, id` 순으로 읽으므로 지금의 id 순서가 그대로 유지된다.
alter table public.products
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ── 4. orders ────────────────────────────────────────────────────────────────
-- 송장 정보와 관리자 메모. 고객이 입력하는 값이 아니므로 모두 nullable이고,
-- `updated_at`도 기본값 없이 둔다 — "한 번도 손대지 않은 주문"을 구분하려고.
alter table public.orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text,
  add column if not exists admin_memo text,
  add column if not exists updated_at timestamptz;

-- ── 5. updated_at 트리거 ─────────────────────────────────────────────────────
-- 애플리케이션이 매번 `updated_at`을 보내게 하면 한 곳만 빠뜨려도 값이 낡는다.
-- DB가 직접 채운다.
--
-- `set search_path = ''`: Supabase advisor(function_search_path_mutable). 함수
-- 본문이 호출자의 search_path에 따라 다른 객체를 가리키지 않게 고정한다.
-- `now()`는 pg_catalog라 빈 search_path에서도 찾힌다.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ── 6. photos.album_slug FK → on update cascade ──────────────────────────────
-- 관리 화면에서 앨범 슬러그를 바꿀 수 있게 됐다. 기존 FK는 on update 동작이
-- 없어(= no action), 사진이 한 장이라도 있는 앨범은 슬러그를 바꿀 수 없었다.
-- cascade로 다시 건다.
--
-- 삭제 쪽은 **바뀐다**. 프로덕션의 기존 FK는 `on delete cascade`였다(2026-09-16
-- 확인) — 대시보드에서 앨범 행 하나를 지우면 사진 행이 전부 따라 지워지는
-- 설정이다. restrict로 바꾼다: 사진이 남은 앨범은 DB가 지우기를 거절한다.
-- 관리 화면도 사진 0장일 때만 삭제를 허용하므로 정상 경로에는 영향이 없고,
-- 막히는 것은 실수뿐이다.
--
-- 제약 이름을 `photos_album_slug_fkey`로 가정하지 않는다. 대시보드에서 만든
-- 테이블이라 이름이 다를 수 있고, 이름만 보고 drop하면 옛 FK가 남은 채 새 FK가
-- 하나 더 생긴다. photos(album_slug) → albums 인 FK를 전부 찾아 지운다.
do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.contype = 'f'
      and con.conrelid = 'public.photos'::regclass
      and con.confrelid = 'public.albums'::regclass
      and att.attname = 'album_slug'
  loop
    execute format('alter table public.photos drop constraint %I', fk.conname);
  end loop;
end;
$$;

alter table public.photos
  add constraint photos_album_slug_fkey
  foreign key (album_slug) references public.albums (slug)
  on update cascade
  on delete restrict;

-- ── 7. 공개 읽기 정책이 두 스위치를 따르게 한다 ──────────────────────────────
-- 사이트의 공개 조회는 `hidden = false`, `published = true`로 걸러 읽지만, 그건
-- 이 사이트 코드가 예의 바르게 굴 때의 이야기다. anon 키는 브라우저에 실려
-- 있으므로 누구든 `/rest/v1/photos?select=*`를 직접 부를 수 있고, 정책이
-- `using (true)`면 숨긴 사진이 그대로 나온다. "숨김"이 이름값을 하려면 DB가
-- 거른다.
--
-- 관리 화면은 service-role로 읽으므로 RLS를 우회해 숨긴 것도 계속 본다.
-- 지금 배포된 코드와도 호환된다: 적용 시점에는 숨긴 사진도 비공개 앨범도
-- 없으므로 공개 조회 결과가 한 행도 달라지지 않는다.
--
-- 비공개 앨범의 **사진**까지 정책에서 막지는 않는다. 행마다 albums를 조인하는
-- 정책은 목록 조회 전체를 느리게 만들고, 앨범 비공개는 "목록에서 내리기"에
-- 가깝다 — 사진 단위로 감출 것은 `hidden`이 맡는다.
drop policy if exists "public read photos" on public.photos;
create policy "public read photos" on public.photos
  for select to anon, authenticated
  using (hidden = false);

drop policy if exists "public read albums" on public.albums;
create policy "public read albums" on public.albums
  for select to anon, authenticated
  using (published = true);

commit;
