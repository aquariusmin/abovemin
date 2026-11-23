// zod를 화면 번들에 끌어오지 않으려고 schemas.ts에서 떼어 둔 상한. 규칙의 원본은 여기다.

export const ALBUM_SLUG_RE = /^[a-z0-9-]{1,64}$/;

// 가장 큰 앨범(112장)을 통째로 고를 수 있되, 실수로 전체를 날리지는 않을 정도.
export const MAX_BULK = 200;

// Cloudinary Admin API `DELETE resources`의 한 번 상한.
export const MAX_ORPHAN_DELETE = 100;

// 사진술의 시작(1826) ~ 내년. `api/admin/photos`의 연도 규칙과 같다.
export const MIN_YEAR = 1826;

// 서버의 409 메시지와 화면의 `MigrationNotice`가 같은 이름을 적는다.
export const ADMIN_STUDIO_MIGRATION = 'supabase/migrations/20260916000000_admin_studio.sql';
export const ARCHIVE_EXTRAS_MIGRATION = 'supabase/migrations/20260916100000_archive_extras.sql';
export const UPLOAD_PRIVACY_MIGRATION = 'supabase/migrations/20260917010000_upload_privacy.sql';
export const ORDER_EMAIL_STATUS_MIGRATION = 'supabase/migrations/20261014000000_order_email_status.sql';
