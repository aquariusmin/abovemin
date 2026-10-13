---
paths:
  - "supabase/**"
  - "scripts/backup/**"
  - "frontend/src/lib/supabase.ts"
  - "frontend/src/lib/supabase-admin.ts"
  - "frontend/src/lib/db-compat.ts"
---

# Supabase

Supabase 프로젝트는 하나뿐이고 그것이 운영이다. 스테이징도, 로컬 스택도 없다.

- **스키마 변경은 `supabase/migrations/`의 파일로만 한다.** 적용은 사용자가 대시보드 SQL Editor에서 한다. MCP의 `apply_migration`은 막혀 있고, `execute_sql`은 매번 확인을 받는다 — 읽기(`select`)에만 쓰고, 쓰기 SQL은 승인 없이 실행하지 않는다.
- **추가만 하는 마이그레이션을 쓴다.** 컬럼은 nullable이거나 기본값이 있고, `if not exists`로 다시 돌려도 안전해야 한다. backfill은 "컬럼을 처음 만들 때만" 돌게 한다.
- **코드가 먼저 배포될 수 있다.** 새 컬럼·테이블을 읽는 쪽은 `withColumnFallback`과 `isMissingColumnError`/`isMissingTableError`(`lib/db-compat.ts`)로 없는 경우를 견딘다.
- 파일 이름은 `YYYYMMDDHHMMSS_설명.sql`. 앞 파일에 의존하면 파일 머리 주석과 `frontend/README.md`의 "마이그레이션 적용" 절에 순서를 적는다.
- `photos`·`albums`·`products`·`places`·공개된 `notes`는 anon 키로 읽힌다. 거기에 넣는 컬럼은 공개된다고 가정한다. `orders`는 anon에게 열지 않는다.
- 새 테이블에는 RLS를 켜고 정책을 같은 파일에 쓴다.
- 백업 대상 테이블이 늘면 `scripts/backup/`도 같이 고친다. 복원은 저장소 **밖**에서 한다(README "백업").

절차는 `db-change` 스킬에 있다.
