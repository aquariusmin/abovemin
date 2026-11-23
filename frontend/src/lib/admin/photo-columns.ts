import { isMissingColumnError } from '@/lib/db-compat';
import { log } from '@/lib/logger';

// select("*")를 쓰지 않는다: 행이 0개면 어느 마이그레이션 단계인지 알 수 없다.

const STUDIO = 'hidden, created_at';
const EXTRAS = 'width, height, taken_at, camera, exif_checked_at';
const PRIVACY = 'gps_in_original';

export const PHOTO_COLUMN_LEVEL = {
  full: 0,
  /** `20260917010000_upload_privacy.sql` 전. */
  noPrivacy: 1,
  /** `20260916100000_archive_extras.sql` 전. */
  noExtras: 2,
  /** `20260916000000_admin_studio.sql` 전. */
  legacy: 3,
} as const;

export function photoColumnSets(base: string): string[] {
  return [`${base}, ${STUDIO}, ${EXTRAS}, ${PRIVACY}`, `${base}, ${STUDIO}, ${EXTRAS}`, `${base}, ${STUDIO}`, base];
}

// 컬럼 없음 오류일 때만 다음 단계로 간다. 다른 오류를 삼키면 진짜 장애가 가려진다.
export async function selectWithColumnSets<R extends { error: unknown }>(
  label: string,
  columnSets: readonly string[],
  run: (columns: string) => PromiseLike<R>,
): Promise<R & { level: number }> {
  let level = 0;
  for (;;) {
    const result = await run(columnSets[level]);
    if (!result.error || !isMissingColumnError(result.error) || level === columnSets.length - 1) {
      return { ...result, level };
    }
    log.warn(`${label}.migration_pending`, result.error);
    level += 1;
  }
}
