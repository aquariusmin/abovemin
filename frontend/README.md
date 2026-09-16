# abovemin portfolio

이 저장소는 이상민의 개인 웹사이트이자 데이터 분석 직무 제출용 포트폴리오입니다. 공개 사이트는 작업물을 많이 나열하는 공간이 아니라, 채용 담당자가 먼저 확인해야 할 대표 분석 사례와 보조 프로젝트를 구분해 보여주는 데 초점을 둡니다.

## Portfolio routes

- `/portfolio/submission`: 한국어 채용 제출용 포트폴리오
- `/portfolio/submission/[slug]`: 제출용 프로젝트 상세 페이지
- `/portfolio/print?mode=submission`: 기업 제출용 PDF 저장 화면
- `/en/portfolio/submission`: 영어 제출용 포트폴리오

## Content strategy

제출용 한국어 포트폴리오는 대표 프로젝트 3개를 먼저 보여줍니다.

1. **Busan Station Dwell Conversion Analysis**
   공개 승하차 데이터에서 원자료에 없는 체류 지표를 만들고, 초기 산식이 음수로 붕괴한 문제를 min-shift 보정으로 수정한 분석입니다.

2. **Telecom Customer Churn Analysis**
   공개 고객 이탈 데이터를 기반으로 고객군, 이탈 위험 신호, 설명 가능한 모델, 유지 전략을 연결한 분석입니다. 5.0%p 감소는 실행 전 목표이지 달성 성과로 표현하지 않습니다.

3. **Satellite GDP Insight**
   야간조도와 GDP의 관계를 대체 경제지표 관점에서 검증한 작업입니다. 기존 연구 주제를 새롭게 발명했다고 주장하지 않고, 직접 문제를 세우고 데이터 정합성을 확인한 과정에 초점을 둡니다.

북극항로, 퀀트 자동매매, 대한항공 재무분석, 수업 과제, 서비스 MVP, 설문 연구는 Explore / Archive 영역에 둡니다. 특히 북극항로는 AI 도움을 받아 낯선 도메인을 탐색한 작업이므로 대표 프로젝트로 앞세우지 않습니다.

## Claim boundaries

이 포트폴리오는 수치의 출처와 해석 범위를 함께 적는 방식을 기본 원칙으로 삼습니다.

- R²는 예측 정확도나 인과관계가 아니라 설명력으로만 표현합니다.
- 백테스트는 실거래 성과가 아니라 과거 데이터 기반 시뮬레이션으로 표현합니다.
- 고객 이탈 감소율은 실제 달성치가 아니라 실험 전 제안 목표로 표현합니다.
- AI 도움을 받은 작업은 대표 프로젝트가 아닌 탐색형 작업으로 낮춰 배치합니다.

## Admin (`/admin`)

`ADMIN_PASSWORD`로 로그인합니다(세션 8시간). 탭은 URL(`?tab=`)에 남으므로 새로고침해도 같은 탭이 열립니다. 모든 변경 API는 관리자 세션과 같은 출처(origin)를 확인하고, 본문은 `lib/admin/schemas.ts`의 zod 스키마로 검증합니다.

### 먼저: 마이그레이션 적용

`supabase/migrations/20260916000000_admin_studio.sql`을 Supabase SQL Editor(또는 `supabase db push`)로 적용합니다. 추가만 하는 마이그레이션이라 배포 전에 적용해도 기존 코드가 깨지지 않습니다.

- `albums.published / description`, `photos.hidden`, `products.sort_order`, 각 테이블의 `created_at / updated_at`(트리거로 갱신), `orders.tracking_carrier / tracking_number / admin_memo / updated_at`
- `photos.album_slug` FK를 `on update cascade`로 다시 겁니다 — 사진이 있는 앨범의 슬러그를 바꾸려면 필요합니다.

적용 전에 코드가 먼저 배포돼도 사이트는 동작합니다. 공개 조회는 컬럼이 없다는 오류(42703)를 받으면 필터 없이 다시 읽고, 관리 화면은 해당 기능 자리에 **"마이그레이션 적용 필요"**를 띄웁니다(숨김·공개 전환·송장·메모·상품 정렬).

그 다음 `supabase/migrations/20260916100000_archive_extras.sql`을 적용합니다. **순서가 중요합니다** — 이 파일은 앞 파일이 만드는 `public.set_updated_at()`을 트리거에 씁니다(앞 파일 없이 돌리면 트랜잭션 전체가 되돌려집니다). 역시 추가만 합니다.

- `photos`에 크기와 촬영 정보: `width / height / taken_at / camera / lens / focal_length / aperture / shutter / iso`, 그리고 채우기 작업이 이미 시도했는지 적는 `exif_checked_at`. 전부 nullable.
- `places(name, lat, lng, source)`: 장소 이름 하나에 대략의 좌표 하나. `numeric(4,1)`이라 DB가 소수점 한 자리(약 11km)로 자릅니다. 공개 읽기 허용.
- `notes`: 예전 `src/data/notes.ts` 배열의 자리. 공개 읽기는 `published = true`인 글만.

이 파일이 없어도 사이트는 지금처럼 보입니다: 지도 토글이 나타나지 않고, 라이트박스에 촬영 정보 줄이 없고, `/notes`는 첫 글 전처럼 404입니다(푸터·RSS·sitemap에도 없음). 테이블이 없다는 오류(42P01, PGRST205)도 "아직 없음"으로 읽습니다. 관리 화면의 촬영 정보·장소 좌표·노트 자리에는 "마이그레이션 적용 필요"가 뜹니다.

**위치 정보는 공개 테이블에 저장하지 않습니다.** `photos`는 누구나 anon 키로 읽을 수 있어서, 사진별 위도·경도 컬럼은 두지 않습니다. 사진 GPS는 채우기 작업이 서버 메모리에서만 읽어 장소마다 중앙값을 소수점 한 자리로 반올림한 뒤 `places`에 넣고, 어떤 API 응답에도 반올림 전 좌표를 싣지 않습니다.

### 탭

- **개요** — 앨범·사진·숨긴 사진·판매 중 상품·상태별 주문 수, 최근 추가된 사진 12장, 그리고 **데이터 점검**: 제목/장소가 비었거나 `-`인 사진(앨범별), 빈 앨범, 커버가 없거나 자기 사진이 아니거나 다른 앨범과 겹치는 앨범, 같은 곳의 다른 표기(`서울`/`Seoul`), 판매 중인데 0원인 상품. 항목마다 고칠 자리로 바로 갑니다.
- **아카이브** — 사진 업로드(아래), 그리고 앨범별 사진 관리: 목록/격자 보기, `제목 없음`·`장소 없음`·`숨김` 필터, 행별 정보 수정·숨기기·삭제, 끌어 놓기 또는 ↑↓로 순서 변경 후 `순서 저장`. 체크박스(shift-클릭으로 범위)로 여러 장을 골라 **다른 앨범으로 이동**(대상 앨범 끝에 붙음), **장소/연도 일괄 입력**, **숨기기/보이기**, **삭제**를 한 번에 합니다(최대 200장). 아래의 **장소 이름 바꾸기**는 한 표기를 모든 앨범에서 바꾸며, 바꾸기 전에 몇 장이 바뀌는지 먼저 보여 줍니다.
- **앨범** — 만들기(제목에서 슬러그 제안, 수정 가능), 제목·슬러그·설명 수정, 공개/비공개 전환, 그 앨범의 사진 중에서 커버 고르기, 순서 변경, 사진이 0장인 앨범만 삭제. 비공개 앨범은 목록·검색에서 빠지고 주소로도 열리지 않습니다. 슬러그를 바꾸면 옛 주소는 404가 됩니다.
- **샵** — 상품 추가·수정·삭제(이름, 가격, 카테고리, 태그, 설명, 판매 중, 정렬 순서). 이미지는 브라우저가 Cloudinary `phorage/shop`에 직접 올립니다. 저장하면 `/`, `/shop`, `/shop/[id]`가 다시 구워집니다. 새 상품은 기본으로 판매 중이 아닙니다.
- **주문** — 상태 필터·검색, 상태 흐름(입금 확인 → 배송 시작 → 배송 완료, 취소), 택배사·송장번호·관리자 메모 저장, 지금 필터에 걸린 주문의 **CSV 내려받기**(UTF-8 BOM, 한국어 Excel용). `배송 시작` 때 송장번호가 있으면 배송 안내 메일을 보냅니다(체크 해제 가능). **안내 메일 다시 보내기**로 주문 확인/배송 안내를 재발송합니다(주문당 10분에 3회, 전체 시간당 20회).
- **노트** — 짧은 글 목록(공개/초안 칩), 쓰기·고치기·지우기. 슬러그(영문 소문자·숫자·하이픈 1~80자, 영문 제목에서 제안), 날짜, 요약, 태그(쉼표로), 본문(빈 줄로 문단을 나눔 — 마크다운 없음), **해석 범위**(이 글이 주장하지 않는 것, 필수), 관련 포트폴리오 슬러그, 공개. 오른쪽 미리보기는 공개 글 페이지와 같은 규칙으로 문단을 나눕니다. 새 글은 초안으로 시작하고, 공개된 글이 한 편이라도 생기는 순간 `/notes`·푸터 링크·RSS·sitemap이 함께 나타납니다. 저장하면 `/notes`, `/notes/[slug]`, RSS, sitemap이 다시 구워지고, 공개된 글이 0편 ↔ 1편 이상으로 바뀔 때만 모든 페이지의 푸터(레이아웃)까지 다시 굽습니다. Supabase 대시보드에서 직접 공개 여부를 바꾸면 푸터는 다음 배포나 다음 노트 저장 때 따라옵니다.
- **설정** — 홈 히어로 타이틀·서브타이틀·이미지. 이미지는 주소를 붙여넣거나 **아카이브에서 고르기**(검색·앨범 필터)로 고릅니다. **촬영 정보 채우기**: Cloudinary Admin API에서 원본의 크기와 EXIF(카메라·렌즈·초점거리·조리개·셔터·ISO·촬영일)를 읽어 사진마다 저장합니다. 버튼을 누르면 20장씩 순서대로 돌고 진행률을 보여 주며, 멈췄다가 이어서 할 수 있습니다. EXIF가 없는 사진도 "확인함"으로 표시돼 다시 묻지 않습니다. Admin API는 시간당 약 500회라 남은 호출이 20회 아래로 내려가면 멈춥니다(293장을 한 번 훑는 데 약 293회). 촬영일은 카메라 시계의 벽시계 시각을 시간대 없이 저장하고 날짜만 보여 줍니다. **장소 좌표**: 장소별 사진 수와 위도·경도(소수점 한 자리), 출처(GPS 자동 / 직접 입력 / 좌표 없음). 채우기 작업은 좌표가 **없는** 장소에만 그 장소 사진 GPS의 중앙값을 넣고, 이미 있는 값(손으로 고친 값 포함)은 덮어쓰지 않습니다. 지도 앱에서 `37.5665, 126.9780`을 위도 칸에 붙여 넣으면 두 칸이 같이 채워집니다. 저장하면 `/archive`가 다시 구워집니다. 그 아래 **쓰이지 않는 원본 정리**: `phorage/archive`, `phorage/shop`에서 사이트 어디에서도 참조하지 않는 파일을 찾아 골라 영구 삭제합니다(한 번에 100개). 삭제 직전에 서버가 참조(사진·앨범 커버·상품·사이트 설정)를 다시 확인하고, 그 사이 쓰이게 된 파일은 건너뜁니다.

### 공개 화면에 나가는 것

- **/archive "지도로 보기"** — 앨범을 가로지르는 필터 패널의 토글. 좌표가 있는 장소마다 점 하나(넓이 ∝ 사진 수), 전체 / 한국 / 일본 / 북미 / 호주 / 유럽 칩으로 다시 맞춥니다. 겹친 점은 묶여서, 누르면 확대하거나 목록을 엽니다. 점을 누르면 장소 필터가 그 장소로 바뀝니다. 좌표가 하나도 없으면 토글 자체가 없습니다. 지도는 열 때만 내려받습니다(d3-geo + `world-atlas/land-110m.json`, 약 81 KB / gzip 32 KB) — 외부 요청 없음.
- **라이트박스** — 촬영 정보가 있으면 한 줄("2019.07.31 · iPhone 7 · 4mm · f/1.8 · 1/1053s · ISO 20")과, **이 사진으로 프린트 문의** 링크(`mailto:`, 제목과 본문에 사진 캡션과 `?p=` 링크).
- **그리드** — 크기가 저장된 사진은 이미지가 오기 전에 비율만큼 자리를 잡습니다(크기 자체가 아니라 비율만 씁니다).

## Archive photo upload

아카이브 사진은 두 가지 방법으로 추가합니다. Cloudinary 콘솔과 Supabase Studio를 오갈 필요는 없습니다.

**1. `/admin` → 아카이브 탭** — 앨범을 고르고 사진을 끌어다 놓으면 브라우저가 Cloudinary로 직접 올립니다(서버를 거치지 않으므로 원본 크기 제한이 없습니다). EXIF 촬영일에서 연도가 자동으로 채워지고, 제목/장소를 확인한 뒤 저장하면 `photos` 행이 만들어집니다. 저장 응답을 보낸 **뒤에** 서버가 방금 넣은 사진의 촬영 정보를 채웁니다(`after`, 15초 상한) — 저장 자체는 이 작업의 성공 여부와 상관없고, 시간 안에 못 끝낸 사진은 설정 탭의 "촬영 정보 채우기"가 가져갑니다. 장소와 연도는 일괄 적용 칸으로 한 번에 넣을 수 있습니다. 이미 올라간 사진의 수정·순서·숨김·일괄 작업은 위의 **아카이브** 탭 설명을 봅니다.

삭제는 사이트에서 내리는 것까지이고 Cloudinary 원본은 남습니다 — 원본 정리는 설정 탭에서 따로 합니다. 사진 파일 자체를 교체하는 것은 지원하지 않습니다 — 새로 올리는 쪽을 씁니다.

**2. CLI** — 수십~수백 장을 한 번에 밀어 넣을 때 씁니다.

```bash
npm run photos:add -- --album=korea --location=Seoul --dry-run ./photos/*.jpg
npm run photos:add -- --album=korea --location=Seoul ./photos/*.jpg
```

두 경로 모두 `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`이 필요합니다(`.env.example` 참고). 프로덕션에서 업로드하려면 Vercel 환경변수에도 같은 값을 넣어야 합니다.

저장하지 않고 화면을 떠나면 파일은 Cloudinary에 남되 사이트에는 노출되지 않습니다. 설정 탭의 "쓰이지 않는 원본 정리"에서 찾아 지울 수 있습니다.

## 백업

매일 03:17(KST)에 `.github/workflows/backup.yml`이 Supabase 데이터를 내보내 **age로 암호화**한 뒤 GitHub Actions 아티팩트로 남깁니다. Actions 탭 → **DB backup** → **Run workflow**로 언제든 수동 실행할 수 있습니다.

### 무엇을, 어디에

- **테이블**: `albums`, `photos`, `products`, `orders`, `site_settings`, `places`, `notes`, `quant_fleet`. PostgREST(service-role 키)로 기본키 순서대로 1000행씩 끝까지 읽고, 받은 행 수가 서버가 알려 준 총계와 다르거나 기본키가 겹치면 다시 받습니다. 앞의 다섯 테이블은 읽기에 실패하면 백업 전체가 실패하고, 뒤의 셋은 테이블이 없으면(404) 경고만 남기고 건너뜁니다. `albums`나 `photos`가 0행이면 "빈 백업이 성공처럼 보이는" 사고로 보고 실패시킵니다.
- **아티팩트** `abovemin-backup-YYYYMMDD` (보관 **30일**):
  - `abovemin-backup-YYYYMMDD.tar.age` — 암호문. 안에 `<table>.json`, `manifest.json`, `migrations/*.sql`, `schema/openapi.json`(컬럼·타입·기본키·FK), `schema/tables.sql`(기본 테이블 DDL 초안)이 있습니다.
  - `manifest.json` — **평문**. 테이블 이름, 행 수, 시각, 마이그레이션 파일 이름만 담습니다. 같은 내용이 실행 요약(Summary)에도 찍힙니다.
- **저장소가 공개**라서 로그와 아티팩트는 누구나 볼 수 있다고 가정합니다. `orders`에는 고객 이름·이메일·전화·주소가 있으므로 평문 JSON은 러너 임시 디렉터리에만 있다가 지워지고, 스크립트는 응답 본문을 찍지 않습니다(테이블 이름·행 수·HTTP 상태·오류 코드만).
- DB 비밀번호가 없어 `pg_dump`는 쓰지 않습니다. 그래서 인덱스·트리거·check/unique 제약 같은 스키마 세부는 백업에 **없습니다** — `migrations/`와 `schema/tables.sql`이 그 자리를 대신합니다(아래 복원 참고).

### 켜기 (한 번만)

1. **age 키를 로컬에서 만듭니다.** age 1.3 이상이 필요합니다(`brew install age`).

   ```bash
   mkdir -p ~/.config/abovemin && chmod 700 ~/.config/abovemin
   age-keygen -pq -o ~/.config/abovemin/backup-age.key
   age-keygen -y ~/.config/abovemin/backup-age.key   # 공개 키(age1pq1…) 한 줄 출력
   ```

   `-pq`(포스트퀀텀 하이브리드)를 권합니다. 공개 저장소의 아티팩트는 누구나 내려받을 수 있으므로, "지금 받아 두고 나중에 푸는" 경우까지 막는 편이 낫습니다. `-pq` 없이 만든 일반 키(`age1…`)도 동작하지만 **두 종류를 한 파일에 섞을 수는 없습니다**.

2. **개인 키는 오프라인에만 둡니다.** `backup-age.key` 파일 내용을 비밀번호 관리자(1Password 등)에 보안 노트로 저장합니다. 이 키를 잃으면 모든 백업을 풀 수 없고, 반대로 이 키는 GitHub 시크릿·저장소·Vercel 어디에도 넣지 않습니다.

3. **공개 키를 커밋합니다.** `scripts/backup/recipients.txt`의 `REPLACE_ME_WITH_AGE_PUBLIC_KEY` 줄을 위에서 출력된 공개 키로 바꿉니다(공개 키라 커밋해도 안전합니다). 이 줄이 바뀌기 전까지 워크플로는 일부러 실패합니다.

4. **GitHub 시크릿**(Settings → Secrets and variables → Actions → Repository secrets):
   - `SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase 대시보드 → Project Settings → API의 service-role(또는 `sb_secret_…`) 키

5. Actions 탭에서 **DB backup**을 한 번 수동 실행해 아티팩트와 요약의 행 수를 확인합니다.

키를 바꿀 때는 새 공개 키로 `recipients.txt`를 교체하되, 옛 개인 키도 30일(마지막 옛 백업이 만료될 때)까지는 보관합니다.

### 복원

```bash
# 1. 아티팩트를 내려받아 풀고(zip), 저장소 **밖**에서 복호화한다
#    (저장소 안에 풀면 고객 정보가 든 JSON을 실수로 커밋할 수 있다)
mkdir -p ~/abovemin-restore && chmod 700 ~/abovemin-restore
age -d -i ~/.config/abovemin/backup-age.key abovemin-backup-20260917.tar.age | tar -C ~/abovemin-restore -xf -
cat ~/abovemin-restore/abovemin-backup-20260917/manifest.json
```

복원이 끝나면 `rm -rf ~/abovemin-restore`로 평문을 지웁니다.

2. **새 Supabase 프로젝트에 스키마를 세웁니다.** SQL Editor에서 순서대로 실행합니다.
   1. `schema/tables.sql` — 대시보드에서 만든 기본 테이블(albums·photos·products·orders·site_settings·quant_fleet)과 그 RLS 정책의 **초안**입니다. OpenAPI에서 되살린 것이라 인덱스·check/unique 제약은 없으니 읽어 보고 실행합니다.
   2. `migrations/*.sql` — 파일 이름 순서대로. `places`·`notes`와 트리거, albums/photos 공개 정책, `photos_album_slug_sort_order_idx` 인덱스가 여기서 생깁니다.

3. **데이터를 넣습니다.** 먼저 계획만 봅니다(기본이 `--dry-run`이고, 네트워크 요청을 하지 않습니다).

   ```bash
   node scripts/backup/restore.mjs --dir ~/abovemin-restore/abovemin-backup-20260917 --url https://<new-ref>.supabase.co
   ```

   확인했으면 실제로 넣습니다. 대상은 **항상 명시**합니다 — URL은 `--url`로만, 키는 `RESTORE_SERVICE_ROLE_KEY`로만 받고 `.env.local`의 값은 읽지 않습니다(새 프로젝트에 넣으려다 프로덕션을 덮어쓰는 사고를 막기 위해서).

   ```bash
   RESTORE_SERVICE_ROLE_KEY='<new project service-role key>' \
     node scripts/backup/restore.mjs --dir ~/abovemin-restore/abovemin-backup-20260917 --url https://<new-ref>.supabase.co --apply
   ```

   - 순서는 FK 의존 순서입니다: `albums` → `photos` → `products` → `orders` → `site_settings` → `places` → `notes` → `quant_fleet`. 500행씩 upsert(`resolution=merge-duplicates`)하므로 중간에 실패해도 다시 돌리면 됩니다. `--only photos,albums`로 일부만 넣을 수 있습니다.
   - ⚠️ **`notes.id`는 `generated always as identity`**라 PostgREST로 id를 넣으면 거절됩니다(428C9). 스크립트는 id를 빼고 `slug`로 upsert합니다 — 노트 번호는 새로 매겨지지만 id를 참조하는 곳은 없습니다. 원래 id를 꼭 지켜야 하면 SQL Editor에서 `insert into public.notes (...) overriding system value select ...`로 넣습니다.
   - `numeric` 값(`places` 좌표, `quant_fleet`)은 자릿수가 깎이지 않게 원문 그대로 보냅니다.

4. **시퀀스를 맞춥니다.** albums·photos·products·orders의 id는 명시해 넣었으므로 시퀀스가 1에 머물러 있습니다. 스크립트가 마지막에 출력하는 `select setval(...)` 네 줄을 SQL Editor에서 실행하지 않으면 다음 사진 업로드·주문이 기본키 충돌로 실패합니다.

5. Vercel 환경변수의 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`와 GitHub 시크릿을 새 프로젝트 값으로 바꾸고 재배포합니다. 사진 파일 자체는 Cloudinary에 있으므로 DB 행만 돌아오면 그대로 보입니다.

스크립트의 순수 로직 테스트: `node --test scripts/backup/lib.test.mjs` (저장소 루트에서, 의존성 없음). 이 파일이나 워크플로를 고치는 PR에서 자동으로 돕니다.

## Tech stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase

## Development

```bash
npm ci
npm run dev
npm run build
```

이 프로젝트는 Next.js 최신 버전을 사용합니다. 라우팅, 메타데이터, 정적 경로 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 문서를 먼저 확인합니다.

## Submission checklist

- 대표 프로젝트가 부산 체류 분석, 고객 이탈 XAI, Satellite GDP Insight 순서로 보이는지 확인
- 북극항로가 Explore / Archive 영역에 있는지 확인
- `/portfolio/print?mode=submission`에서 PDF 저장 시 대표 3개가 먼저 나오는지 확인
- 성과처럼 읽힐 수 있는 숫자 옆에 해석 범위가 붙어 있는지 확인
