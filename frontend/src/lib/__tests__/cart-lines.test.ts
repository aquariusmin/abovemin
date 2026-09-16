import { describe, expect, it } from 'vitest';
import {
  addLine,
  cartCount,
  cartLineKey,
  cartTotal,
  MAX_LINE_QUANTITY,
  migrateCartLines,
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
      { key: '3', id: 3, option_id: null, option_label: null, name: '숲 포스터', price: 30000, image_url: 'https://x/p.jpg', quantity: 2 },
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
