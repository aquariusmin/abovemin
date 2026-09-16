import { describe, expect, it } from 'vitest';
import {
  changedFields,
  draftFromProduct,
  EMPTY_PRODUCT_DRAFT,
  newOptionId,
  payloadFromDraft,
  type AdminProductRow,
  type ProductDraft,
} from '@/lib/admin/product-draft';
import { ProductCreate, ProductUpdate } from '@/lib/admin/schemas';

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
