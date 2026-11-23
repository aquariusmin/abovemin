import { log } from './logger';

// 마이그레이션보다 코드가 먼저 배포될 때를 견딘다. 42703=select·filter의 없는 컬럼, PGRST204=insert/update의 없는 컬럼.
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

// 42P01=SQL 수준 테이블 없음, PGRST205=스키마 캐시에 없음(REST는 실제로 이쪽). `archive_extras` 대기.
export function isMissingTableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as PgErrorLike;
  if (code === '42P01' || code === 'PGRST205') return true;
  if (typeof message !== 'string') return false;
  return /relation .+ does not exist/i.test(message) || /could not find the table/i.test(message);
}

// 공개 조회가 "없음"으로 읽어도 되는 오류는 이것뿐이다 — 나머지는 진짜 장애다.
export function isMissingSchemaError(error: unknown): boolean {
  return isMissingColumnError(error) || isMissingTableError(error);
}

// `20261123000000_orders_email_optional.sql` 적용 전 이메일 없는 주문 — 주문 라우트가 빈 문자열로 재시도.
export function isNotNullViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as PgErrorLike;
  if (code === '23502') return true;
  return typeof message === 'string' && /violates not-null constraint/i.test(message);
}

// 같은 멱등 키의 동시 주문 중 늦은 쪽이 받는다 — 먼저 들어간 주문을 다시 읽어 답한다(`api/orders`).
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as PgErrorLike;
  if (code === '23505') return true;
  return typeof message === 'string' && /duplicate key value violates unique constraint/i.test(message);
}

// 컬럼 없음 오류일 때만 fallback. 다른 오류는 그대로 돌려준다(삼키면 진짜 장애가 가려진다).
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
