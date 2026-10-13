---
paths:
  - "frontend/src/app/api/admin/**"
  - "frontend/src/app/admin/**"
  - "frontend/src/components/admin/**"
  - "frontend/src/lib/admin/**"
  - "frontend/src/lib/auth.ts"
  - "frontend/src/lib/supabase-admin.ts"
---

# Admin

- **모든 `api/admin/*` 핸들러는 가드로 시작한다**(`lib/admin/route-helpers.ts`): 읽기는 `guardRead`, 변경은 `guardMutation`(세션 + 같은 출처 확인). 가드 없는 핸들러를 만들지 않는다.
- 본문은 `parseBody`와 `lib/admin/schemas.ts`의 zod 스키마로 검증한다. 새 입력은 스키마부터 더한다.
- DB는 `adminDb()`(service-role)로 접근한다. `getSupabaseAdmin`과 service-role 키는 서버 전용이다 — 클라이언트 컴포넌트가 import하는 모듈에 끌려 들어가지 않게 한다.
- DB 오류는 `dbErrorResponse`로 돌려준다. 마이그레이션이 아직 없는 경우는 `migrationNotice`로 알리고, 반쯤 저장하지 않는다(409).
- 변경 뒤에는 공개 페이지 캐시를 맞춘다: `revalidateArchive`·`revalidateNotes`(`lib/cache-tags.ts`), `revalidateShop`(`lib/admin/revalidate.ts`).
- 관리자가 넣는 이미지 주소는 저장 시점에 `isRenderableImageUrl`로 확인한다. 호스트는 부분 문자열이 아니라 `URL.hostname`으로 본다(SSRF — `lib/cloudinary.ts` 주석).
- **사진별 위도·경도를 공개 테이블에 저장하지 않는다.** `photos`는 anon 키로 읽힌다. 좌표는 `places`에 소수점 한 자리로만 남긴다.
- 업로드는 EXIF의 GPS를 지운 뒤 올린다(`lib/exif-strip.ts`, `lib/admin/upload-privacy.ts`).
- 클라이언트 요청은 `lib/admin/client.ts`의 `adminFetch`를 쓴다(401 처리가 한곳에 있다).
- 순수 로직은 `lib/admin/*`에 두고 `src/lib/__tests__/admin-*.test.ts`로 덮는다.
