import { describe, expect, it } from 'vitest';
import {
  addLine,
  addLines,
  cascadedAddons,
  cartCount,
  cartLineKey,
  cartTotal,
  MAX_LINE_QUANTITY,
  migrateCartLines,
  placeAddonsUnderParents,
  removeLine,
  setLineQuantity,
  toOrderItems,
  type NewCartLine,
} from '@/lib/cart-lines';

/**
 * 이 파일이 지키는 것: 같은 상품의 다른 옵션은 다른 줄이고, 옵션 이전에 저장된
 * 장바구니도 살아남고, 주문 API로는 가격이 나가지 않는다.
 */

const poster = (option: { id: string; label: string; price: number } | null): NewCartLine => ({
  id: 3,
  option_id: option?.id ?? null,
  option_label: option?.label ?? null,
  name: '숲 포스터',
  price: option?.price ?? 30000,
  image_url: 'https://x/poster.jpg',
});

const A3 = { id: 'a3', label: 'A3 · 매트지', price: 38000 };
const A2 = { id: 'a2', label: 'A2 · 매트지', price: 58000 };

describe('cartLineKey()', () => {
  it('옵션이 없으면 상품 id, 있으면 상품 id:옵션 id', () => {
    expect(cartLineKey(3)).toBe('3');
    expect(cartLineKey(3, null)).toBe('3');
    expect(cartLineKey(3, 'a3')).toBe('3:a3');
    expect(cartLineKey(3, 'a3')).not.toBe(cartLineKey(3, 'a2'));
    expect(cartLineKey(3, 'a3')).not.toBe(cartLineKey(33, 'a3'));
  });
});

describe('addLine()', () => {
  it('같은 옵션은 수량을 올리고, 다른 옵션은 새 줄이다', () => {
    let lines = addLine([], poster(A3));
    lines = addLine(lines, poster(A3));
    lines = addLine(lines, poster(A2));
    expect(lines.map(line => [line.key, line.quantity])).toEqual([
      ['3:a3', 2],
      ['3:a2', 1],
    ]);
    expect(cartTotal(lines)).toBe(38000 * 2 + 58000);
    expect(cartCount(lines)).toBe(3);
  });

  it('옵션 없는 상품과 옵션 있는 같은 상품도 섞이지 않는다', () => {
    const lines = addLine(addLine([], poster(null)), poster(A3));
    expect(lines.map(line => line.key)).toEqual(['3', '3:a3']);
  });

  it('다시 담으면 이름·가격은 새 값으로 바뀐다', () => {
    const lines = addLine(addLine([], poster(A3)), { ...poster(A3), price: 40000 });
    expect(lines[0]).toMatchObject({ price: 40000, quantity: 2 });
  });

  it('수량은 99를 넘지 않는다(주문 스키마의 상한)', () => {
    const lines = addLine([], poster(A3), 150);
    expect(lines[0].quantity).toBe(MAX_LINE_QUANTITY);
    expect(addLine(lines, poster(A3))[0].quantity).toBe(MAX_LINE_QUANTITY);
  });
});

describe('setLineQuantity() / removeLine()', () => {
  it('열쇠로 한 줄만 바꾸고, 0 이하면 지운다', () => {
    const lines = addLine(addLine([], poster(A3)), poster(A2));
    expect(setLineQuantity(lines, '3:a2', 5).map(line => line.quantity)).toEqual([1, 5]);
    expect(setLineQuantity(lines, '3:a3', 0).map(line => line.key)).toEqual(['3:a2']);
    expect(setLineQuantity(lines, '3:a3', 1000)[0].quantity).toBe(MAX_LINE_QUANTITY);
    expect(removeLine(lines, '3:a2').map(line => line.key)).toEqual(['3:a3']);
  });
});

describe('toOrderItems()', () => {
  it('id·옵션 id·수량만 보낸다 — 가격과 이름은 서버가 믿지 않는 값이다', () => {
    const lines = addLine(addLine([], poster(A3)), poster(null));
    expect(toOrderItems(lines)).toEqual([
      { id: 3, option_id: 'a3', quantity: 1 },
      { id: 3, option_id: null, quantity: 1 },
    ]);
  });
});

describe('migrateCartLines()', () => {
  it('옵션 이전의 줄에 열쇠와 빈 옵션을 붙여 살린다', () => {
    const migrated = migrateCartLines([
      { id: 3, name: '숲 포스터', price: 30000, image_url: 'https://x/p.jpg', quantity: 2 },
    ]);
    expect(migrated).toEqual([
      { key: '3', id: 3, option_id: null, option_label: null, addon_id: null, addon_label: null, name: '숲 포스터', price: 30000, image_url: 'https://x/p.jpg', quantity: 2 },
    ]);
  });

  it('망가진 줄은 버리고, 같은 열쇠는 합친다', () => {
    const migrated = migrateCartLines([
      null,
      { id: 'x', name: 'a', price: 1, quantity: 1 },
      { id: 4, name: '엽서', price: 2000, quantity: 1 },
      { id: 4, name: '엽서', price: 2000, quantity: 3 },
      { id: 5, name: '포스터', price: 30000, quantity: 1, option_id: 'a3', option_label: 'A3' },
    ]);
    expect(migrated.map(line => [line.key, line.quantity, line.image_url])).toEqual([
      ['4', 4, ''],
      ['5:a3', 1, ''],
    ]);
  });

  it('배열이 아니면 빈 장바구니', () => {
    expect(migrateCartLines(undefined)).toEqual([]);
    expect(migrateCartLines({ items: [] })).toEqual([]);
  });
});

/**
 * 추가 상품(달력의 거치대)은 제 수량을 가진 줄이지만 혼자서는 있을 수 없다:
 * 부모 줄 아래에 놓이고, 부모가 사라지면 같이 사라진다.
 */
describe('추가 상품 줄', () => {
  const calendar: NewCartLine = { id: 9, option_id: null, option_label: null, name: '2027 Calendar', price: 18000, image_url: 'https://x/cal.jpg' };
  const stand: NewCartLine = { id: 9, option_id: null, option_label: null, addon_id: 'stand', addon_label: '거치대', name: '2027 Calendar', price: 3000, image_url: '' };
  const envelope: NewCartLine = { ...stand, addon_id: 'env', addon_label: '봉투', price: 500 };
  const posterStand: NewCartLine = { ...poster(null), addon_id: 'stand', addon_label: '집게', price: 4000, image_url: '' };

  it('열쇠는 상품 id + 추가 상품 id — 옵션 열쇠와 겹치지 않는다', () => {
    expect(cartLineKey(9, null, 'stand')).toBe('9+stand');
    expect(cartLineKey(9, 'stand')).toBe('9:stand');
    expect(cartLineKey(9, null, 'stand')).not.toBe(cartLineKey(9, 'stand'));
    expect(cartLineKey(9, null, 'stand')).not.toBe(cartLineKey(99, null, 'stand'));
    // 추가 상품 줄은 옵션과 무관하다 — 옵션 id가 같이 와도 열쇠에 들어가지 않는다.
    expect(cartLineKey(9, 'a3', 'stand')).toBe('9+stand');
  });

  it('상품 줄과 함께 담기고, 제 수량을 가진다', () => {
    const lines = addLines([], [{ line: calendar }, { line: stand, quantity: 2 }, { line: envelope, quantity: 0 }]);
    expect(lines.map(line => [line.key, line.quantity])).toEqual([
      ['9', 1],
      ['9+stand', 2],
    ]);
    expect(lines[1]).toMatchObject({ addon_id: 'stand', addon_label: '거치대', option_id: null, name: '2027 Calendar', price: 3000 });
    expect(cartTotal(lines)).toBe(18000 + 3000 * 2);
    expect(cartCount(lines)).toBe(3);
  });

  it('같은 추가 상품을 다시 담으면 그 줄의 수량이 오른다(상한 99)', () => {
    let lines = addLines([], [{ line: calendar }, { line: stand }]);
    lines = addLines(lines, [{ line: calendar }, { line: stand, quantity: 2 }]);
    expect(lines.map(line => [line.key, line.quantity])).toEqual([
      ['9', 2],
      ['9+stand', 3],
    ]);
    lines = addLines(lines, [{ line: calendar }, { line: stand, quantity: 500 }]);
    expect(lines[1].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('부모 줄 없이는 담기지 않는다', () => {
    expect(addLine([], stand)).toEqual([]);
    expect(addLines([], [{ line: stand, quantity: 3 }])).toEqual([]);
    // 다른 상품의 줄은 부모가 아니다.
    expect(addLines(addLine([], poster(null)), [{ line: stand }]).map(line => line.key)).toEqual(['3']);
  });

  it('부모 줄 바로 아래에 놓인다 — 부모 줄의 순서는 그대로', () => {
    let lines = addLines([], [{ line: calendar }, { line: stand }]);
    lines = addLine(lines, poster(A3));
    lines = addLine(lines, envelope);
    expect(lines.map(line => line.key)).toEqual(['9', '9+stand', '9+env', '3:a3']);
    // 같은 상품이 옵션별로 두 줄이면 마지막 줄 아래. 추가 상품은 특정 옵션의 것이 아니다.
    let posters = addLine(addLine([], poster(A3)), calendar);
    posters = addLine(posters, poster(A2));
    posters = addLine(posters, posterStand);
    expect(posters.map(line => line.key)).toEqual(['3:a3', '9', '3:a2', '3+stand']);
  });

  it('추가 상품이 없는 장바구니는 순서도 내용도 건드리지 않는다', () => {
    const lines = addLine(addLine(addLine([], poster(A3)), calendar), poster(A2));
    expect(placeAddonsUnderParents(lines)).toEqual(lines);
  });

  it('추가 상품 줄만 따로 지우거나 수량을 바꿀 수 있다', () => {
    const lines = addLines([], [{ line: calendar }, { line: stand, quantity: 2 }, { line: envelope }]);
    expect(setLineQuantity(lines, '9+stand', 5).map(line => [line.key, line.quantity])).toEqual([
      ['9', 1],
      ['9+stand', 5],
      ['9+env', 1],
    ]);
    expect(removeLine(lines, '9+stand').map(line => line.key)).toEqual(['9', '9+env']);
    expect(setLineQuantity(lines, '9+env', 0).map(line => line.key)).toEqual(['9', '9+stand']);
    expect(cascadedAddons(lines, '9+stand')).toEqual([]);
  });

  it('상품의 마지막 줄을 지우면 그 상품의 추가 상품 줄도 사라진다', () => {
    let lines = addLines([], [{ line: calendar }, { line: stand }, { line: envelope }]);
    lines = addLine(lines, poster(A3));
    expect(cascadedAddons(lines, '9').map(line => line.key)).toEqual(['9+stand', '9+env']);
    expect(removeLine(lines, '9').map(line => line.key)).toEqual(['3:a3']);
    // 수량을 0으로 줄여 지워도 같다.
    expect(setLineQuantity(lines, '9', 0).map(line => line.key)).toEqual(['3:a3']);
  });

  it('부모 줄이 하나라도 남으면 추가 상품은 남는다', () => {
    let lines = addLine(addLine([], poster(A3)), poster(A2));
    lines = addLine(lines, posterStand);
    expect(cascadedAddons(lines, '3:a3')).toEqual([]);
    expect(removeLine(lines, '3:a3').map(line => line.key)).toEqual(['3:a2', '3+stand']);
    expect(removeLine(removeLine(lines, '3:a3'), '3:a2')).toEqual([]);
  });

  it('주문 API로는 부모 id·추가 상품 id·수량만 나간다 — 가격도 이름도 없다', () => {
    let lines = addLine([], poster(A3));
    lines = addLines(lines, [{ line: calendar }, { line: stand, quantity: 2 }]);
    expect(toOrderItems(lines)).toEqual([
      { id: 3, option_id: 'a3', quantity: 1 },
      { id: 9, option_id: null, quantity: 1 },
      { id: 9, addon_id: 'stand', quantity: 2 },
    ]);
  });

  it('추가 상품 이전(v1)에 저장된 장바구니는 그대로 옮겨진다', () => {
    // v1 줄: `key`·`option_*`는 있고 `addon_*`는 없다.
    const v1 = [
      { key: '3:a3', id: 3, option_id: 'a3', option_label: 'A3 · 매트지', name: '숲 포스터', price: 38000, image_url: 'https://x/poster.jpg', quantity: 2 },
      { key: '9', id: 9, option_id: null, option_label: null, name: '2027 Calendar', price: 18000, image_url: 'https://x/cal.jpg', quantity: 1 },
    ];
    expect(migrateCartLines(v1)).toEqual(v1.map(line => ({ ...line, addon_id: null, addon_label: null })));
  });

  it('저장된 추가 상품 줄(v2)은 살리고, 부모 없는 줄은 버린다', () => {
    const stored = [
      { key: '9+stand', id: 9, option_id: null, option_label: null, addon_id: 'stand', addon_label: '거치대', name: '2027 Calendar', price: 3000, image_url: '', quantity: 2 },
      { key: '9', id: 9, option_id: null, option_label: null, addon_id: null, addon_label: null, name: '2027 Calendar', price: 18000, image_url: 'https://x/cal.jpg', quantity: 1 },
      { key: '5+box', id: 5, option_id: null, option_label: null, addon_id: 'box', addon_label: '상자', name: '없는 부모', price: 1000, image_url: '', quantity: 1 },
    ];
    expect(migrateCartLines(stored).map(line => [line.key, line.quantity, line.addon_label])).toEqual([
      ['9', 1, null],
      ['9+stand', 2, '거치대'],
    ]);
  });
});
