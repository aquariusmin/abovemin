import { log } from './logger';

/**
 * 스키마보다 코드가 먼저 배포됐을 때를 견디는 도구.
 *
 * `20260916000000_admin_studio.sql`이 `albums.published`, `photos.hidden` 같은
 * 컬럼을 더한다. 마이그레이션은 사람이 대시보드에서 적용하므로, 코드가 먼저
 * 나가는 순간이 생길 수 있다. 그때 공개 페이지가 "column does not exist"로
 * 통째로 500을 내면 안 된다 — 필터 없이 읽는 것이 사이트가 멈추는 것보다 낫다.
 *
 * 오류는 두 모양으로 온다.
 *  - `42703` (undefined_column): select·filter·order에 없는 컬럼을 쓴 경우.
 *    PostgREST가 Postgres 코드를 그대로 전달한다.
 *  - `PGRST204`: insert/update 본문에 스키마 캐시가 모르는 컬럼이 있는 경우.
 */
export interface PgErrorLike {
  code?: string | null;
  message?: string | null;
}

export function isMissingColumnError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as PgErrorLike;
  if (code === '42703' || code === 'PGRST204') return true;
  // 코드가 비어 오는 경로(프록시·구버전 PostgREST)를 대비해 문구도 본다.
  return typeof message === 'string' && /column .+ does not exist/i.test(message);
}

/**
 * 새 컬럼을 쓰는 쿼리를 먼저 보내고, 그 컬럼이 없다는 오류일 때만 예전
 * 쿼리로 한 번 더 보낸다. 다른 오류(네트워크, 권한)는 그대로 돌려준다 —
 * 그걸 삼키고 필터 없는 결과를 내면 진짜 장애가 가려진다.
 *
 * `migrationPending`은 관리 화면이 "마이그레이션 적용 필요"를 띄우는 근거다.
 */
export async function withColumnFallback<R extends { error: unknown }>(
  label: string,
  primary: () => PromiseLike<R>,
  fallback: () => PromiseLike<R>,
): Promise<R & { migrationPending: boolean }> {
  const first = await primary();
  if (!first.error || !isMissingColumnError(first.error)) {
    return { ...first, migrationPending: false };
  }
  log.warn(`${label}.migration_pending`, first.error);
  const second = await fallback();
  return { ...second, migrationPending: true };
}
