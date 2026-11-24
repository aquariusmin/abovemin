import { isMissingColumnError } from '@/lib/db-compat';

// 빈 새 컬럼은 빼고 다시 쓰고, 빼면 내용이 사라지는 저장은 409로 막는다(반쯤 저장하지 않는다).

// 20260917020000_shop_ready 이후 컬럼. 빼도 in_stock·image_url에 기본 정보가 남는다.
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

/** `slug`는 20261124000000_product_slug 이후 컬럼이다. */
export const SLUG_COLUMNS = ['slug'] as const;

export type BlockedBy = 'slug' | 'addons' | 'shop_ready';

export interface WriteResult<T> {
  data: T | null;
  error: unknown;
}

export interface WriteOutcome<T> {
  result: WriteResult<T>;
  written: Row;
  migrationPending: boolean;
  // 있으면 저장하지 않았다 — 어느 마이그레이션이 빠졌는지.
  blocked?: BlockedBy;
}

// slug → 추가 상품 컬럼 → shop_ready 컬럼 순으로(새 것부터) 한 겹씩 벗겨 다시 쓴다. 오류 문구는 읽지 않는다.
export async function writeWithFallback<T>(
  row: Row,
  write: (values: Row) => PromiseLike<WriteResult<T>>,
): Promise<WriteOutcome<T>> {
  let written = row;
  let result = await write(written);
  let migrationPending = false;

  // 주소를 정했는데 컬럼이 없으면 막는다 — 빼고 저장하면 관리자는 주소가 바뀐 줄 안다.
  if (result.error && isMissingColumnError(result.error) && SLUG_COLUMNS.some(key => key in written)) {
    if (written.slug) return { result, written, migrationPending, blocked: 'slug' };
    migrationPending = true;
    written = without(written, SLUG_COLUMNS);
    result = await write(written);
  }

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
