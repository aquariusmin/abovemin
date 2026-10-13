import { isMissingColumnError } from '@/lib/db-compat';

/**
 * 상품을 저장할 때 **새 컬럼이 아직 없는 DB**를 견디는 규칙. 머지가 곧 배포이고
 * 마이그레이션은 사람이 적용하므로, 관리 API가 새 컬럼에 쓰려는 순간 그 컬럼이
 * 없을 수 있다.
 *
 * 규칙은 두 줄이다.
 *  - 새 컬럼의 값이 **비어 있으면** 그 키를 빼고 다시 쓴다. 이름·가격·판매 여부
 *    수정은 마이그레이션과 상관없이 계속 된다.
 *  - 빼면 **내용이 사라지는** 저장은 다시 쓰지 않고 막는다(라우트가 409로 답한다).
 *    관리자는 "저장했습니다"를 보고 옵션·추가 상품이 들어갔다고 믿는다.
 *
 * 라우트(`api/admin/products`)에서 꺼내 둔 이유: 이 사다리는 실제 DB에서 한 번도
 * 돌려 보지 못한 채 배포된다(스테이징이 없다). DB 없이 테스트로 잠근다.
 */

/**
 * `status`·`images`·`options`·`edition`은 20260917020000_shop_ready 이후 컬럼이다.
 * 상태는 `in_stock`에, 커버는 `image_url`에 이미 담겨 있으므로 빼도 기본 정보는
 * 남는다.
 */
export const SHOP_READY_COLUMNS = ['status', 'images', 'options', 'edition'] as const;

/** `addons`·`related_ids`는 20261014010000_product_addons 이후 컬럼이다. */
export const ADDON_COLUMNS = ['addons', 'related_ids'] as const;

type Row = Record<string, unknown>;

function without(row: Row, columns: readonly string[]): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !columns.includes(key)));
}

export function withoutShopReadyColumns(row: Row): Row {
  return without(row, SHOP_READY_COLUMNS);
}

export function withoutAddonColumns(row: Row): Row {
  return without(row, ADDON_COLUMNS);
}

/** shop_ready 컬럼을 빼면 사라지는 내용: 옵션, 두 장 이상의 이미지, 에디션. */
export function losesDataWithoutMigration(row: Row): boolean {
  const images = Array.isArray(row.images) ? row.images.length : 0;
  const options = Array.isArray(row.options) ? row.options.length : 0;
  return images > 1 || options > 0 || Boolean(row.edition);
}

/** 추가 상품 컬럼을 빼면 사라지는 내용: 추가 상품이나 함께 구매가 하나라도 있음. */
export function losesAddonDataWithoutMigration(row: Row): boolean {
  return ADDON_COLUMNS.some(key => Array.isArray(row[key]) && (row[key] as unknown[]).length > 0);
}

export type BlockedBy = 'addons' | 'shop_ready';

export interface WriteResult<T> {
  data: T | null;
  error: unknown;
}

export interface WriteOutcome<T> {
  result: WriteResult<T>;
  /** 마지막으로 보낸 행. 라우트가 여기서 한 겹(`sort_order`) 더 벗길 수 있다. */
  written: Row;
  /** 새 컬럼을 빼고 저장했는가. */
  migrationPending: boolean;
  /** 있으면 저장하지 않았다 — 어느 마이그레이션이 빠졌는지. */
  blocked?: BlockedBy;
}

/**
 * 한 번 쓰고, 컬럼이 없다는 오류면 새 컬럼을 한 겹씩 벗겨 다시 쓴다:
 * 추가 상품 컬럼 → shop_ready 컬럼.
 *
 * 추가 상품 컬럼을 먼저 벗기는 이유: 나중 마이그레이션이라 "이것만 없는" 상태가
 * 가장 흔하다. 그 키가 행에 없으면 이 겹은 건너뛴다 — 추가 상품과 무관한 저장은
 * 예전과 똑같은 횟수로 쓴다.
 *
 * 어느 컬럼이 없어서 난 오류인지는 보지 않는다(오류 문구를 읽어야 해서 깨지기
 * 쉽다). 그래서 추가 상품 내용이 든 행은 shop_ready가 빠진 DB에서도
 * `'addons'`로 막힌다 — 그 파일의 머리 주석이 shop_ready를 먼저 적용하라고 한다.
 */
export async function writeWithFallback<T>(
  row: Row,
  write: (values: Row) => PromiseLike<WriteResult<T>>,
): Promise<WriteOutcome<T>> {
  let written = row;
  let result = await write(written);
  let migrationPending = false;

  if (result.error && isMissingColumnError(result.error) && ADDON_COLUMNS.some(key => key in written)) {
    if (losesAddonDataWithoutMigration(written)) return { result, written, migrationPending, blocked: 'addons' };
    migrationPending = true;
    written = withoutAddonColumns(written);
    result = await write(written);
  }

  if (result.error && isMissingColumnError(result.error)) {
    if (losesDataWithoutMigration(written)) return { result, written, migrationPending, blocked: 'shop_ready' };
    migrationPending = true;
    written = withoutShopReadyColumns(written);
    result = await write(written);
  }

  return { result, written, migrationPending };
}
