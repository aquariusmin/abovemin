/**
 * 관리 API의 상한과 형식. 서버 스키마(`schemas.ts`)와 브라우저 화면이 같이 본다.
 *
 * `schemas.ts`에서 떼어 둔 이유: 화면이 숫자 하나를 쓰려고 그 파일을 import하면
 * zod 전체가 관리 화면 번들에 딸려 온다. 규칙의 원본은 여기 하나다.
 */

export const ALBUM_SLUG_RE = /^[a-z0-9-]{1,64}$/;

/** 한 번에 다루는 사진 수. 가장 큰 앨범(112장)을 통째로 고를 수 있으면서, 실수로 전체를 날리지는 않을 정도. */
export const MAX_BULK = 200;

/** Cloudinary Admin API의 `DELETE resources`가 한 번에 받는 상한. */
export const MAX_ORPHAN_DELETE = 100;

/** 사진술의 시작(1826) ~ 내년. `api/admin/photos`의 연도 규칙과 같다. */
export const MIN_YEAR = 1826;

/**
 * 관리 화면이 "무엇을 적용하라"고 안내할 마이그레이션 파일. 서버의 409 메시지와
 * 화면의 `MigrationNotice`가 같은 이름을 적는다.
 */
export const ADMIN_STUDIO_MIGRATION = 'supabase/migrations/20260916000000_admin_studio.sql';
export const ARCHIVE_EXTRAS_MIGRATION = 'supabase/migrations/20260916100000_archive_extras.sql';
export const UPLOAD_PRIVACY_MIGRATION = 'supabase/migrations/20260917010000_upload_privacy.sql';
