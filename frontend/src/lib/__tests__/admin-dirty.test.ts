import { describe, expect, it } from 'vitest';
import { isDraftDirty, sameValue } from '@/lib/admin/dirty';
import { EMPTY_PRODUCT_DRAFT, type ProductDraft } from '@/lib/admin/product-draft';

describe('sameValue', () => {
  it('원시값', () => {
    expect(sameValue('a', 'a')).toBe(true);
    expect(sameValue('35000', 35000)).toBe(false);
    expect(sameValue(true, false)).toBe(false);
    expect(sameValue(null, undefined)).toBe(false);
    expect(sameValue(NaN, NaN)).toBe(true);
  });

  it('배열은 순서까지 같아야 한다', () => {
    expect(sameValue([1, 2], [1, 2])).toBe(true);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue([1], [1, 1])).toBe(false);
    expect(sameValue([], {})).toBe(false);
  });

  it('객체는 키 순서와 무관하게 내용으로 비교한다', () => {
    expect(sameValue({ a: 1, b: [{ c: 'x' }] }, { b: [{ c: 'x' }], a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameValue({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });
});

describe('isDraftDirty', () => {
  const note = { title: '제목', body: '본문', slug: 'a', slugTouched: false };

  it('같은 값이면 깨끗하다 — 새로 만든 같은 모양의 객체여도', () => {
    expect(isDraftDirty({ ...note }, note)).toBe(false);
  });

  it('입력 하나만 바뀌어도 더럽다', () => {
    expect(isDraftDirty({ ...note, body: '본문.' }, note)).toBe(true);
  });

  it('고쳤다가 되돌리면 다시 깨끗하다', () => {
    const edited = { ...note, title: '제목!' };
    expect(isDraftDirty({ ...edited, title: '제목' }, note)).toBe(false);
  });

  it('무시할 필드는 비교하지 않는다', () => {
    expect(isDraftDirty({ ...note, slugTouched: true }, note, ['slugTouched'])).toBe(false);
    expect(isDraftDirty({ ...note, slugTouched: true }, note)).toBe(true);
  });

  it('상품: 이미지 순서만 바꿔도, 옵션 재고만 바꿔도 더럽다', () => {
    const base: ProductDraft = {
      ...EMPTY_PRODUCT_DRAFT,
      name: '프린트',
      images: [
        { url: 'https://x/a.jpg', label: '', custom: false },
        { url: 'https://x/b.jpg', label: '액자', custom: false },
      ],
      options: [{ id: 'a4', label: 'A4', price: '30000', in_stock: true }],
    };
    const copy: ProductDraft = structuredClone(base);
    expect(isDraftDirty(copy, base)).toBe(false);
    expect(isDraftDirty({ ...copy, images: [...copy.images].reverse() }, base)).toBe(true);
    expect(isDraftDirty({ ...copy, options: [{ ...copy.options[0], in_stock: false }] }, base)).toBe(true);
  });
});
