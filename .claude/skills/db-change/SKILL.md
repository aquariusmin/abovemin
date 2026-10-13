---
name: db-change
description: abovemin의 Supabase 스키마를 바꿀 때 쓴다 — 컬럼·테이블·인덱스·RLS 정책 추가나 변경, 마이그레이션 파일 작성. "컬럼 추가", "테이블 만들어", "마이그레이션", "RLS" 요청과, 새 DB 필드가 필요한 기능 작업에 사용.
---

# DB 변경

Supabase 프로젝트는 운영 하나뿐이다. 그래서 순서가 정해져 있다: **파일을 쓴다 → 코드가 없는 경우를 견디게 한다 → 사용자가 적용한다.** 직접 적용하지 않는다.

## 1. 지금 스키마를 본다

Supabase MCP의 읽기 도구(`list_tables`, `list_migrations`, `get_advisors`)로 실제 상태를 확인한다. 저장소에는 베이스 스키마가 없다 — 처음 테이블들은 대시보드에서 만들어졌고 `supabase/migrations/`는 그 뒤의 변경만 담는다. `execute_sql`은 `select`에만 쓰고, `orders`의 개인정보 컬럼은 조회하지 않는다.

## 2. 마이그레이션 파일을 쓴다

`supabase/migrations/YYYYMMDDHHMMSS_설명.sql`. 기존 파일들의 형식을 따른다.

- **추가만 한다.** 새 컬럼은 nullable이거나 기본값이 있다. 이름 변경·삭제·타입 변경이 필요하면 멈추고 사용자와 단계를 나눈다(추가 → 코드 전환 → 나중에 제거).
- **다시 돌려도 안전하게.** `add column if not exists`, `create index if not exists`, `drop policy if exists` 뒤 `create policy`.
- **backfill은 컬럼을 처음 만들 때만.** 다시 돌렸을 때 관리자가 바꾼 값을 되돌리면 안 된다(`20260917020000_shop_ready.sql` 참고).
- 새 테이블은 RLS를 켜고 정책을 같은 파일에 쓴다. anon에게 읽기를 열면 그 테이블의 모든 컬럼이 공개된다. 위치·연락처·메모 같은 값을 공개 테이블에 넣지 않는다.
- 앞 파일에 의존하면(함수, 트리거) 파일 머리 주석에 적는다.

## 3. 코드가 없는 경우를 견디게 한다

머지는 곧 배포이고 마이그레이션은 사람이 적용하므로, 코드가 먼저 나가는 순간이 있다.

- 읽기: `withColumnFallback`(`frontend/src/lib/db-compat.ts`)으로 새 컬럼이 없으면 옛 쿼리로 다시 읽는다.
- 쓰기: 새 컬럼 없이는 저장할 수 없는 값이면 반쯤 저장하지 말고 409와 `migrationNotice`로 알린다(`lib/admin/route-helpers.ts`).
- 관리 화면: 해당 기능 자리에 "마이그레이션 적용 필요"가 뜨게 한다.

## 4. 같이 고칠 것

- `frontend/README.md` "먼저: 마이그레이션 적용" 절에 파일과 순서, 적용 전 동작을 적는다.
- 백업 대상이 바뀌면 `scripts/backup/`(`node --test scripts/backup/lib.test.mjs`).
- `frontend/src/lib/__tests__/`에 폴백 경로 테스트.

## 5. 넘긴다

PR 설명에 다음을 적는다: 적용할 파일과 순서, 적용 전에 배포돼도 사이트가 어떻게 동작하는지, 되돌리는 SQL. 적용은 사용자가 대시보드 SQL Editor에서 하고, 그 전에 최근 야간 백업이 성공했는지(Actions의 "DB backup") 확인하라고 안내한다.

적용됐다는 말을 들으면 `list_migrations`/`list_tables`와 `get_advisors`(보안·성능)로 결과를 확인한다.
