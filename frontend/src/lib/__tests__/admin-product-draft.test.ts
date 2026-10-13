import { describe, expect, it } from 'vitest';
import {
  changedFields,
  draftFromProduct,
  EMPTY_PRODUCT_DRAFT,
  newAddonId,
  newOptionId,
  payloadFromDraft,
  relatedCandidates,
  type AdminProductRow,
  type ProductDraft,
} from '@/lib/admin/product-draft';
import { ProductCreate, ProductUpdate } from '@/lib/admin/schemas';
import { isDraftDirty } from '@/lib/admin/dirty';
import { OPTION_ID_RE } from '@/lib/product';

/**
 * 이 파일이 지키는 것: 편집기가 만드는 본문을 서버 스키마가 받아들이고, 저장할
 * 때는 바뀐 필드만 나간다. 편집기와 스키마가 따로 움직이면 "저장"이 400이 된다.
 */

const IMG = 'https://res.cloudinary.com/dmljaqqzc/image/upload/v1/phorage/shop/';

const row: AdminProductRow = {
  id: 7,
  name: '숲 포스터',
  price: 38000,
  image_url: `${IMG}front.jpg`,
  category: 'Poster',
  tag: null,
  description: '',
  in_stock: true,
  sort_order: 2,
  status: 'available',
  edition: '한정 30부',
  images: [
    { url: `${IMG}front.jpg`, label: '앞면' },
    { url: `${IMG}frame.jpg`, label: '액자에 넣은 모습' },
  ],
  options: [
    { id: 'a3', label: 'A3 · 매트지', price: 38000, in_stock: true },
    { id: 'a2', label: 'A2 · 매트지', price: 58000, in_stock: false },
  ],
};

const filled = (patch: Partial<ProductDraft> = {}): ProductDraft => ({
  ...EMPTY_PRODUCT_DRAFT,
  name: '엽서',
  price: '2000',
  images: [{ url: `${IMG}card.jpg`, label: '', custom: false }],
  ...patch,
});

describe('draftFromProduct()', () => {
  it('기본 선택지 밖의 이미지 설명은 직접 입력으로 연다', () => {
    const draft = draftFromProduct(row);
    expect(draft.images.map(image => [image.label, image.custom])).toEqual([
      ['앞면', false],
      ['액자에 넣은 모습', true],
    ]);
    expect(draft.options[1]).toEqual({ id: 'a2', label: 'A2 · 매트지', price: '58000', in_stock: false });
  });

  it('마이그레이션 전의 행은 image_url 한 장, 옛 규칙의 상태', () => {
    const legacy = draftFromProduct({ ...row, status: undefined, images: undefined, options: undefined, edition: undefined, price: 0 });
    expect(legacy.images).toEqual([{ url: `${IMG}front.jpg`, label: '', custom: false }]);
    expect(legacy.status).toBe('draft');
    expect(legacy.edition).toBe('');
  });
});

describe('payloadFromDraft()', () => {
  it('서버 스키마가 받는 본문을 만든다', () => {
    const result = payloadFromDraft(draftFromProduct(row), { includeSortOrder: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).toMatchObject({ price: 38000, image_url: `${IMG}front.jpg`, sort_order: 2, status: 'available' });
    expect(ProductCreate.safeParse(result.body).success).toBe(true);
    expect(ProductUpdate.safeParse({ id: 7, ...result.body }).success).toBe(true);
  });

  it('옵션이 있으면 가격 칸 대신 가장 싼 옵션 가격', () => {
    const result = payloadFromDraft(
      filled({
        price: 'abc',
        options: [
          { id: 'a2', label: 'A2', price: '58000', in_stock: true },
          { id: 'a4', label: 'A4', price: '22000', in_stock: false },
        ],
      }),
      { includeSortOrder: false },
    );
    expect(result.ok && result.body.price).toBe(22000);
    expect(result.ok && 'sort_order' in result.body).toBe(false);
  });

  it('비운 설명은 null, 앞뒤 공백은 걷는다', () => {
    const result = payloadFromDraft(
      filled({ name: '  엽서 ', images: [{ url: `${IMG}a.jpg`, label: '  ', custom: true }] }),
      { includeSortOrder: false },
    );
    expect(result.ok && result.body.name).toBe('엽서');
    expect(result.ok && result.body.images).toEqual([{ url: `${IMG}a.jpg`, label: null }]);
  });

  it('고칠 수 있는 첫 문제를 알려 준다', () => {
    const fail = (draft: ProductDraft) => {
      const result = payloadFromDraft(draft, { includeSortOrder: true });
      return result.ok ? null : result.error;
    };
    expect(fail(filled({ name: ' ' }))).toContain('상품명');
    expect(fail(filled({ price: '1.5' }))).toContain('가격');
    expect(fail(filled({ sort_order: 'x' }))).toContain('정렬');
    expect(fail(filled({ images: [] }))).toContain('이미지');
    expect(fail(filled({ options: [{ id: 'a3', label: '', price: '1000', in_stock: true }] }))).toContain('이름');
    expect(fail(filled({ options: [{ id: 'a3', label: 'A3', price: '-1', in_stock: true }] }))).toContain('A3');
    // 판매 중인데 팔 가격이 없다.
    expect(fail(filled({ status: 'available', price: '0' }))).toContain('판매 중');
    expect(fail(filled({ status: 'available', price: '0', options: [{ id: 'a3', label: 'A3', price: '1000', in_stock: false }] }))).toContain(
      '판매 중',
    );
    expect(fail(filled({ status: 'draft', price: '0' }))).toBeNull();
  });
});

describe('changedFields()', () => {
  it('바뀐 필드만, 배열은 순서까지 비교한다', () => {
    const before = payloadFromDraft(draftFromProduct(row), { includeSortOrder: true });
    const draft = draftFromProduct(row);
    const reordered = payloadFromDraft({ ...draft, images: [...draft.images].reverse(), tag: '' }, { includeSortOrder: true });
    if (!before.ok || !reordered.ok) throw new Error('fixture');
    const changed = changedFields(before.body, reordered.body);
    // 커버가 바뀌었으니 image_url도 같이 나간다.
    expect(Object.keys(changed).sort()).toEqual(['image_url', 'images']);
    expect(changedFields(before.body, before.body)).toEqual({});
  });
});

describe('newOptionId()', () => {
  it('형식에 맞고 겹치지 않는다', () => {
    const id = newOptionId([]);
    expect(id).toMatch(/^opt-[a-z0-9]{5}$/);
    const fixed = () => 0;
    const first = newOptionId([], fixed);
    expect(newOptionId([first], fixed)).not.toBe(first);
  });
});

/**
 * 추가 상품과 함께 구매. 편집기 입력 → 본문 → 서버 스키마가 끝까지 맞아야 하고,
 * 저장하지 않은 변경으로도 잡혀야 한다.
 */
describe('추가 상품 · 함께 구매', () => {
  const stand = { id: 'add-stand', label: '거치대', price: '3000', in_stock: true };
  const withExtras: AdminProductRow = {
    ...row,
    addons: [
      { id: 'add-stand', label: '거치대', price: 3000, in_stock: true },
      { id: 'add-env', label: '봉투', price: 500, in_stock: false },
    ],
    related_ids: [12, 3, 7, 12],
  };

  it('행에서 읽는다 — 자기 자신과 중복은 빠지고, 순서는 그대로', () => {
    const draft = draftFromProduct(withExtras);
    expect(draft.addons).toEqual([stand, { id: 'add-env', label: '봉투', price: '500', in_stock: false }]);
    expect(draft.related_ids).toEqual([12, 3]);
  });

  it('마이그레이션 전의 행(컬럼 없음)은 둘 다 빈 목록', () => {
    const draft = draftFromProduct(row);
    expect(draft.addons).toEqual([]);
    expect(draft.related_ids).toEqual([]);
  });

  it('서버 스키마가 받는 본문을 만든다', () => {
    const result = payloadFromDraft(filled({ addons: [{ ...stand, label: ' 거치대 ' }], related_ids: [4, 2] }), { includeSortOrder: true });
    if (!result.ok) throw new Error(result.error);
    expect(result.body.addons).toEqual([{ id: 'add-stand', label: '거치대', price: 3000, in_stock: true }]);
    expect(result.body.related_ids).toEqual([4, 2]);
    expect(ProductCreate.safeParse(result.body).success).toBe(true);
    expect(ProductUpdate.safeParse({ id: 1, ...result.body }).success).toBe(true);
  });

  it('추가 상품은 상품 가격과 판매 가능 판정에 끼지 않는다', () => {
    // 옵션이 없으면 가격 칸의 값이 그대로다 — 가장 싼 추가 상품 값으로 바뀌지 않는다.
    const result = payloadFromDraft(filled({ status: 'available', price: '18000', addons: [stand] }), { includeSortOrder: false });
    expect(result.ok && result.body.price).toBe(18000);
    // 추가 상품만 있고 본 상품 가격이 0이면 판매 중이 될 수 없다.
    const noPrice = payloadFromDraft(filled({ status: 'available', price: '0', addons: [stand] }), { includeSortOrder: false });
    expect(!noPrice.ok && noPrice.error).toContain('판매 중');
  });

  it('고칠 수 있는 첫 문제를 "추가 상품"이라는 말로 알려 준다', () => {
    const fail = (draft: ProductDraft, selfId?: number) => {
      const result = payloadFromDraft(draft, { includeSortOrder: true, selfId });
      return result.ok ? null : result.error;
    };
    expect(fail(filled({ addons: [{ ...stand, label: ' ' }] }))).toBe('1번째 추가 상품의 이름을 적어 주세요.');
    expect(fail(filled({ addons: [{ ...stand, label: 'ㄱ'.repeat(41) }] }))).toContain('추가 상품 이름은 40자');
    expect(fail(filled({ addons: [{ ...stand, price: '3,000원' }] }))).toBe('“거치대” 추가 상품의 가격은 0 이상의 정수(원)로 적어 주세요.');
    expect(fail(filled({ addons: [{ ...stand, id: 'Stand' }] }))).toContain('추가 상품의 id');
    const eleven = Array.from({ length: 11 }, (_, i) => ({ ...stand, id: `add-${i}` }));
    expect(fail(filled({ addons: eleven }))).toBe('추가 상품은 10개까지 둘 수 있습니다.');
    expect(fail(filled({ addons: eleven.slice(0, 10) }))).toBeNull();
    // 옵션의 문제는 여전히 "옵션"이라고 말한다.
    expect(fail(filled({ options: [{ id: 'a3', label: '', price: '1000', in_stock: true }] }))).toBe('1번째 옵션의 이름을 적어 주세요.');
  });

  it('함께 구매: 6개까지, 중복 없이, 자기 자신 없이', () => {
    const fail = (related_ids: number[], selfId?: number) => {
      const result = payloadFromDraft(filled({ related_ids }), { includeSortOrder: true, selfId });
      return result.ok ? null : result.error;
    };
    expect(fail([1, 2, 3, 4, 5, 6])).toBeNull();
    expect(fail([1, 2, 3, 4, 5, 6, 7])).toBe('함께 구매는 6개까지 고를 수 있습니다.');
    expect(fail([1, 2, 1])).toContain('두 번');
    expect(fail([1, 7], 7)).toContain('자신');
    expect(fail([1, 7], 8)).toBeNull();
    // 새 상품에는 아직 id가 없다.
    expect(fail([1, 7])).toBeNull();
  });

  it('바뀐 필드만 나간다 — 순서만 바꿔도 바뀐 것이다', () => {
    const options = { includeSortOrder: true, selfId: withExtras.id };
    const base = draftFromProduct(withExtras);
    const before = payloadFromDraft(base, options);
    const reordered = payloadFromDraft({ ...base, related_ids: [3, 12] }, options);
    const repriced = payloadFromDraft({ ...base, addons: base.addons.map((addon, i) => (i === 0 ? { ...addon, price: '3500' } : addon)) }, options);
    if (!before.ok || !reordered.ok || !repriced.ok) throw new Error('fixture');
    expect(changedFields(before.body, reordered.body)).toEqual({ related_ids: [3, 12] });
    expect(Object.keys(changedFields(before.body, repriced.body))).toEqual(['addons']);
    expect(changedFields(before.body, before.body)).toEqual({});
  });

  it('마이그레이션 전의 행은 고쳐도 두 필드를 보내지 않는다', () => {
    const options = { includeSortOrder: true, selfId: row.id };
    const before = payloadFromDraft(draftFromProduct(row), options);
    const renamed = payloadFromDraft({ ...draftFromProduct(row), name: '숲 포스터 2' }, options);
    if (!before.ok || !renamed.ok) throw new Error('fixture');
    expect(changedFields(before.body, renamed.body)).toEqual({ name: '숲 포스터 2' });
  });

  it('저장하지 않은 변경으로 잡힌다: 추가 상품의 값, 함께 구매의 추가·순서', () => {
    const base = draftFromProduct(withExtras);
    expect(isDraftDirty(structuredClone(base), base)).toBe(false);
    expect(isDraftDirty({ ...base, addons: base.addons.map((addon, i) => (i === 1 ? { ...addon, in_stock: true } : addon)) }, base)).toBe(true);
    expect(isDraftDirty({ ...base, addons: base.addons.slice(0, 1) }, base)).toBe(true);
    expect(isDraftDirty({ ...base, related_ids: [...base.related_ids, 5] }, base)).toBe(true);
    expect(isDraftDirty({ ...base, related_ids: [...base.related_ids].reverse() }, base)).toBe(true);
    expect(isDraftDirty({ ...base, related_ids: [...base.related_ids] }, base)).toBe(false);
  });
});

describe('newAddonId()', () => {
  it('옵션 id와 같은 형식이고 머리말이 다르다', () => {
    const id = newAddonId([]);
    expect(id).toMatch(/^add-[a-z0-9]{5}$/);
    expect(id).toMatch(OPTION_ID_RE);
    const fixed = () => 0;
    const first = newAddonId([], fixed);
    const second = newAddonId([first], fixed);
    expect(second).not.toBe(first);
    expect(second).toMatch(OPTION_ID_RE);
  });
});

describe('relatedCandidates()', () => {
  const products = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it('자기 자신과 이미 고른 것을 뺀 나머지, 목록 순서대로', () => {
    expect(relatedCandidates(products, [3], 1).map(p => p.id)).toEqual([2, 4]);
    expect(relatedCandidates(products, [], undefined).map(p => p.id)).toEqual([1, 2, 3, 4]);
    expect(relatedCandidates(products, [1, 2, 3, 4], undefined)).toEqual([]);
    // 지워진 상품의 id가 고른 목록에 남아 있어도 문제없다.
    expect(relatedCandidates(products, [99], 2).map(p => p.id)).toEqual([1, 3, 4]);
  });
});
