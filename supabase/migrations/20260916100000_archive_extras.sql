-- ⚠️ 적용 순서: 20260916000000_admin_studio.sql **다음에** 적용한다.
--    `public.set_updated_at()`을 그 파일이 만들기 때문이다. 이 파일만 먼저
--    돌리면 트리거 생성에서 실패하고, 트랜잭션 전체가 되돌려진다.
--
-- 사진의 촬영 정보(EXIF), 장소 좌표, 그리고 노트를 DB로 옮긴다.
--
-- 전부 추가(additive)만 한다. 새 컬럼은 모두 nullable이고 새 테이블은 새
-- 이름이라, **지금 배포된 코드**와 호환된다: `select('*')`가 컬럼을 더 받을
-- 뿐이고, 어떤 insert/update도 새 컬럼을 요구하지 않는다.
--
-- 반대로 코드가 먼저 배포되고 이 파일이 나중에 적용돼도 사이트는 깨지지
-- 않는다. 공개 조회는 테이블/컬럼이 없다는 오류(42P01·42703·PGRST204·
-- PGRST205)를 "없음"으로 읽는다 — 지도는 숨고, 노트는 첫 글 전처럼 잠들어
-- 있고, 라이트박스는 촬영 정보 줄을 그리지 않는다. 관리 화면은 해당 자리에
-- "마이그레이션 적용 필요"를 띄운다.
--
-- 적용 방법은 아래 셋 중 하나:
--   - Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행
--   - supabase db push  (CLI를 연결해 둔 경우)
--   - psql "$DATABASE_URL" -f 이파일

begin;

-- ── 1. photos: 크기와 촬영 정보 ──────────────────────────────────────────────
-- `width`/`height`: Cloudinary에 저장된 원본의 픽셀 크기. 화면은 **비율만**
-- 쓴다 — 그리드가 이미지를 받기 전에 자리를 잡아 두려고. 원본이 1500px
-- 안팎으로 줄어 있는 사진이 많아서, 이 숫자로 프레임 크기를 정하면 안 된다.
--
-- `taken_at`: EXIF `DateTimeOriginal`. EXIF의 시각은 **카메라 시계의 벽시계
-- 시각**이고 시간대가 없다(있어도 카메라가 한국 시간에 맞춰진 채 호주에서
-- 찍은 사진이 실제로 있다). 없는 시간대를 지어내지 않고, 벽시계 시각을 그대로
-- UTC 자리에 적는다: "2019:07:31 14:55:19" → 2019-07-31 14:55:19+00.
-- 읽는 쪽은 항상 UTC로 포맷한다(`lib/caption.ts`) — 그래야 찍은 곳의 날짜가
-- 하루 밀리지 않는다. 절대 시각으로 비교하는 용도로 쓰지 않는다.
--
-- 카메라·렌즈·초점거리·조리개·셔터는 표시용으로 정규화한 **문자열**이다
-- ("Apple iPhone 7", "4mm", "f/1.8", "1/1053", "2s"). 숫자로 검색할 일이 없고,
-- 정규화 규칙은 코드(`lib/admin/photo-metadata.ts`)가 테스트와 함께 쥔다.
--
-- `exif_checked_at`: 채우기 작업이 이미 **시도한** 사진. EXIF가 없는 사진도
-- 여기에 시각이 남으므로, 같은 사진을 매번 Cloudinary에 다시 묻지 않는다
-- (Admin API는 시간당 호출 수가 제한돼 있다).
--
-- ⚠️ 위도·경도 컬럼은 **없다. 앞으로도 두지 않는다.** photos는 anon이 읽을 수
-- 있는 테이블이라, 여기 적힌 좌표는 누구나 `/rest/v1/photos`로 꺼내 갈 수
-- 있다 — 집 앞에서 찍은 사진이면 집 주소다. 좌표는 아래 `places`에 장소
-- 이름 단위로, 소수점 한 자리(약 11km)로만 둔다.
alter table public.photos
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists taken_at timestamptz,
  add column if not exists camera text,
  add column if not exists lens text,
  add column if not exists focal_length text,
  add column if not exists aperture text,
  add column if not exists shutter text,
  add column if not exists iso integer,
  add column if not exists exif_checked_at timestamptz;

-- ── 2. places: 장소 이름 → 대략의 좌표 ───────────────────────────────────────
-- `/archive`의 지도가 쓴다. 키는 `photos.location`에 적힌 표기 그대로다
-- (FK는 걸지 않는다 — location은 자유 입력이고, 이름을 바꾸는 순간 FK가
-- 막아서는 게 아니라 그냥 새 이름의 좌표가 비는 편이 낫다).
--
-- `numeric(4,1)`: 소수점 한 자리로 **DB가** 자른다. 코드가 반올림을 빠뜨려도
-- 정밀한 좌표가 저장되지 않는다.
--
-- `source`: 'gps'는 채우기 작업이 사진 GPS의 중앙값으로 넣은 값, 'manual'은
-- 관리 화면에서 사람이 적은 값. 채우기 작업은 행이 이미 있으면 **절대 덮어쓰지
-- 않는다** — 손으로 고친 값이 이긴다.
create table if not exists public.places (
  name text primary key,
  lat numeric(4, 1) not null check (lat between -90 and 90),
  lng numeric(4, 1) not null check (lng between -180 and 180),
  source text not null default 'manual' check (source in ('gps', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places enable row level security;

drop policy if exists "public read places" on public.places;
create policy "public read places" on public.places
  for select to anon, authenticated
  using (true);

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- ── 3. notes: 짧은 글 ────────────────────────────────────────────────────────
-- `src/data/notes.ts`의 정적 배열을 옮긴 것. 필드와 뜻은 그대로다.
--
-- `boundary`는 not null이다. 이 글들이 존재하는 이유가 "무엇을 말하지 않는지"를
-- 먼저 긋는 데 있으므로, 그 줄 없이 저장되는 글은 이 사이트의 노트가 아니다.
--
-- `body`는 문단을 빈 줄로 나눈 **텍스트 하나**다. 마크다운 파서를 두지 않는다 —
-- 글이 다섯 편일 때 파서가 글보다 무겁다. 렌더링이 빈 줄로 나눠 `<p>`를 만든다.
--
-- `published = false`인 글은 공개 정책이 거른다. 초안의 슬러그를 알아도 anon
-- 키로는 읽히지 않는다. 관리 화면은 service-role로 읽으므로 초안도 본다.
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  title text not null,
  date date not null,
  summary text not null,
  tags text[] not null default '{}',
  body text not null,
  boundary text not null,
  -- 관련 케이스 스터디가 있으면 그 slug (`Note.relatedProject`).
  related_project text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "public read published notes" on public.notes;
create policy "public read published notes" on public.notes
  for select to anon, authenticated
  using (published = true);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

commit;
