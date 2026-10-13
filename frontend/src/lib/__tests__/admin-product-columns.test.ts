import { describe, expect, it } from 'vitest';
import {
  losesAddonDataWithoutMigration,
  losesDataWithoutMigration,
  withoutAddonColumns,
  withoutShopReadyColumns,
  writeWithFallback,
  type WriteResult,
} from '@/lib/admin/product-columns';

/**
 * 이 파일이 지키는 것: 마이그레이션보다 코드가 먼저 배포됐을 때 관리 화면의
 * 저장이 **반쯤 되지 않는다.** 새 컬럼의 내용이 비어 있으면 빼고 저장하고,
 * 내용이 있으면 저장하지 않는다. 이 사다리는 실제 DB에서 돌려 볼 수 없어서
 * (스테이징이 없다) 가짜 DB로 잠근다.
 */

const MISSING = { code: 'PGRST204', message: "Could not find the 'addons' column of 'products' in the schema cache" };

/** `missing`에 든 컬럼이 행에 있으면 "컬럼 없음"으로 답하는 가짜 DB. */
function fakeDb(missing: readonly string[]) {
  const attempts: Array<Record<string, unknown>> = [];
  const write = async (row: Record<string, unknown>): Promise<WriteResult<Record<string, unknown>>> => {
    attempts.push(row);
    return Object.keys(row).some(key => missing.includes(key)) ? { data: null, error: MISSING } : { data: row, error: null };
  };
  return { attempts, write };
}

const SHOP_READY = ['status', 'images', 'options', 'edition'];
const ADDONS = ['addons', 'related_ids'];
const stand = { id: 'add-stand', label: '거치대', price: 3000, in_stock: true };
const base = { name: '2027 Calendar', price: 18000, image_url: 'https://x/cal.jpg', in_stock: true, status: 'available', images: [{ url: 'https://x/cal.jpg', label: null }], options: [], edition: null };

describe('컬럼을 빼면 사라지는 내용', () => {
  it('추가 상품이나 함께 구매가 하나라도 있으면 사라진다', () => {
    expect(losesAddonDataWithoutMigration({ addons: [stand] })).toBe(true);
    expect(losesAddonDataWithoutMigration({ related_ids: [3] })).toBe(true);
    expect(losesAddonDataWithoutMigration({ addons: [], related_ids: [] })).toBe(false);
    expect(losesAddonDataWithoutMigration({ name: '이름만' })).toBe(false);
  });

  it('shop_ready: 옵션, 두 장 이상의 이미지, 에디션', () => {
    expect(losesDataWithoutMigration(base)).toBe(false);
    expect(losesDataWithoutMigration({ ...base, options: [stand] })).toBe(true);
    expect(losesDataWithoutMigration({ ...base, images: [{ url: 'a' }, { url: 'b' }] })).toBe(true);
    expect(losesDataWithoutMigration({ ...base, edition: '한정 30부' })).toBe(true);
  });

  it('빼는 것은 그 마이그레이션의 컬럼뿐이다', () => {
    const row = { ...base, addons: [stand], related_ids: [3] };
    expect(Object.keys(withoutAddonColumns(row)).sort()).toEqual(Object.keys(base).sort());
    expect(Object.keys(withoutShopReadyColumns(row)).sort()).toEqual(['addons', 'image_url', 'in_stock', 'name', 'price', 'related_ids']);
  });
});

describe('writeWithFallback()', () => {
  it('컬럼이 다 있으면 한 번에 쓴다', async () => {
    const db = fakeDb([]);
    const row = { ...base, addons: [stand], related_ids: [3] };
    const outcome = await writeWithFallback(row, db.write);
    expect(db.attempts).toEqual([row]);
    expect(outcome).toMatchObject({ migrationPending: false, written: row });
    expect(outcome.blocked).toBeUndefined();
    expect(outcome.result.error).toBeNull();
  });

  it('추가 상품 컬럼이 없는데 추가 상품을 저장하려 하면 막는다 — 다시 쓰지 않는다', async () => {
    const db = fakeDb(ADDONS);
    const outcome = await writeWithFallback({ ...base, addons: [stand] }, db.write);
    expect(outcome.blocked).toBe('addons');
    expect(db.attempts).toHaveLength(1);
  });

  it('함께 구매만 저장하려 해도 막는다', async () => {
    const db = fakeDb(ADDONS);
    const outcome = await writeWithFallback({ related_ids: [3, 4] }, db.write);
    expect(outcome.blocked).toBe('addons');
    expect(db.attempts).toHaveLength(1);
  });

  it('두 칸이 비어 있으면 그 키를 빼고 저장한다', async () => {
    const db = fakeDb(ADDONS);
    const outcome = await writeWithFallback({ ...base, addons: [], related_ids: [] }, db.write);
    expect(outcome.blocked).toBeUndefined();
    expect(outcome.migrationPending).toBe(true);
    expect(db.attempts).toHaveLength(2);
    expect(db.attempts[1]).toEqual(base);
    expect(outcome.result.data).toEqual(base);
  });

  it('추가 상품과 무관한 저장은 그 마이그레이션 전에도 첫 시도에 들어간다', async () => {
    const db = fakeDb(ADDONS);
    const outcome = await writeWithFallback({ name: '새 이름', price: 19000, in_stock: true }, db.write);
    expect(db.attempts).toHaveLength(1);
    expect(outcome).toMatchObject({ migrationPending: false });
    expect(outcome.blocked).toBeUndefined();
  });

  it('shop_ready도 없으면 한 겹 더 벗긴다 — 예전과 같은 규칙', async () => {
    const db = fakeDb([...ADDONS, ...SHOP_READY]);
    const outcome = await writeWithFallback({ ...base, addons: [], related_ids: [] }, db.write);
    expect(db.attempts.map(row => Object.keys(row).length)).toEqual([10, 8, 4]);
    expect(outcome.written).toEqual({ name: '2027 Calendar', price: 18000, image_url: 'https://x/cal.jpg', in_stock: true });
    expect(outcome.migrationPending).toBe(true);
    expect(outcome.blocked).toBeUndefined();
  });

  it('shop_ready가 없는데 옵션을 저장하려 하면 그쪽으로 막는다', async () => {
    const db = fakeDb(SHOP_READY);
    const outcome = await writeWithFallback({ ...base, options: [stand] }, db.write);
    expect(outcome.blocked).toBe('shop_ready');
    expect(db.attempts).toHaveLength(1);
  });

  it('컬럼 없음이 아닌 오류는 그대로 돌려준다 — 벗겨서 다시 쓰지 않는다', async () => {
    const attempts: unknown[] = [];
    const outage = { code: '57014', message: 'canceling statement due to statement timeout' };
    const outcome = await writeWithFallback({ ...base, addons: [stand] }, async row => {
      attempts.push(row);
      return { data: null, error: outage };
    });
    expect(attempts).toHaveLength(1);
    expect(outcome.result.error).toBe(outage);
    expect(outcome.blocked).toBeUndefined();
    expect(outcome.migrationPending).toBe(false);
  });
});
