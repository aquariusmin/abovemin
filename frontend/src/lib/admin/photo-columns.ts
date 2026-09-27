import { isMissingColumnError } from '@/lib/db-compat';
import { log } from '@/lib/logger';

/**
 * 관리 화면이 `photos`를 읽을 때 쓰는 컬럼 묶음 — 마이그레이션 단계별로.
 *
 * `withColumnFallback`(db-compat)은 새 쿼리 → 옛 쿼리 한 번뿐인데, 관리 화면의
 * 사진 목록은 마이그레이션 세 개가 더한 컬럼을 읽는다. 어느 것이 적용됐는지에
 * 따라 한 단계씩 내려가며 읽고, **몇 단계 내려갔는지**를 돌려준다 — 화면은 그걸
 * 보고 어느 마이그레이션이 빠졌는지 안내한다.
 *
 * `select('*')`로 대신하지 않는 이유: 없는 컬럼을 오류 없이 넘기므로 편하지만,
 * 행이 0개면 어느 단계인지 알 수 없다.
 */

const STUDIO = 'hidden, created_at';
const EXTRAS = 'width, height, taken_at, camera, exif_checked_at';
const PRIVACY = 'gps_in_original';

/** 내려간 단계. 숫자가 클수록 빠진 마이그레이션이 많다. */
export const PHOTO_COLUMN_LEVEL = {
  /** 전부 있음. */
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

/**
 * 컬럼 묶음을 앞에서부터 시도한다. 컬럼이 없다는 오류일 때만 다음으로 가고,
 * 다른 오류(네트워크·권한)는 그 자리에서 돌려준다 — 삼키면 진짜 장애가 가려진다.
 */
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
