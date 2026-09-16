import { describe, expect, it } from 'vitest';
import { orderItemLabel, resolveOrderItems, type OrderableProduct } from '@/lib/order-items';

/**
 * 이 파일이 지키는 것: 주문 금액은 **DB 행에서만** 나온다. 옵션이 생기면서
 * 가격이 상품 한 칸에서 옵션 배열 안으로 옮겨 갔다 — 그 사이에 손님이 보낸
 * 값이 끼어들 틈이 없어야 한다.
 */

const poster: OrderableProduct = {
  id: 3,
  name: '숲 포스터',
  price: 38000, // 관리 API가 맞춘 "가장 싼 옵션" 값 — 주문 금액에는 쓰지 않는다.
  in_stock: true,
  status: 'available',
  options: [
    { id: 'a3', label: 'A3 · 매트지', price: 38000, in_stock: true },
    { id: 'a2', label: 'A2 · 매트지', price: 58000, in_stock: true },
    { id: 'a1', label: 'A1 · 매트지', price: 90000, in_stock: false },
  ],
};

const postcard: OrderableProduct = { id: 4, name: '엽서', price: 2000, in_stock: true, status: 'available', options: [] };

describe('resolveOrderItems()', () => {
  it('옵션의 가격으로 합계를 낸다', () => {
    const result = resolveOrderItems(
      [
        { id: 3, option_id: 'a2', quantity: 2 },
        { id: 4, option_id: null, quantity: 3 },
      ],
      [poster, postcard],
    );
    expect(result).toEqual({
      ok: true,
      items: [
        { id: 3, name: '숲 포스터', option_id: 'a2', option_label: 'A2 · 매트지', price: 58000, quantity: 2 },
        { id: 4, name: '엽서', option_id: null, option_label: null, price: 2000, quantity: 3 },
      ],
      total: 58000 * 2 + 2000 * 3,
    });
  });

  it('요청에 가격이 섞여 와도 쓰지 않는다', () => {
    const tampered = [{ id: 3, option_id: 'a2', quantity: 1, price: 1, name: '공짜' }];
    const result = resolveOrderItems(tampered, [poster]);
    expect(result.ok && result.items[0]).toMatchObject({ price: 58000, name: '숲 포스터' });
  });

  it('없는 옵션, 품절 옵션, 옵션을 안 고른 줄은 막는다', () => {
    expect(resolveOrderItems([{ id: 3, option_id: 'a0', quantity: 1 }], [poster]).ok).toBe(false);
    const soldOut = resolveOrderItems([{ id: 3, option_id: 'a1', quantity: 1 }], [poster]);
    expect(soldOut).toMatchObject({ ok: false });
    expect(!soldOut.ok && soldOut.error).toContain('A1 · 매트지');
    // 옵션이 생기기 전에 담아 둔 장바구니.
    expect(resolveOrderItems([{ id: 3, quantity: 1 }], [poster]).ok).toBe(false);
  });

  it('옵션이 없는 상품에 옵션을 붙여 보내면 막는다', () => {
    expect(resolveOrderItems([{ id: 4, option_id: 'a3', quantity: 1 }], [postcard]).ok).toBe(false);
  });

  it('없는 상품, 초안, 품절 상품은 막는다', () => {
    expect(resolveOrderItems([{ id: 99, quantity: 1 }], [postcard]).ok).toBe(false);
    expect(resolveOrderItems([{ id: 4, quantity: 1 }], [{ ...postcard, status: 'draft' }]).ok).toBe(false);
    const soldOut = resolveOrderItems([{ id: 4, quantity: 1 }], [{ ...postcard, status: 'sold_out' }]);
    expect(!soldOut.ok && soldOut.error).toContain('품절');
    // 판매 중인데 옵션이 전부 품절이면 상품째 품절이다.
    const allOut = { ...poster, options: [{ id: 'a3', label: 'A3', price: 38000, in_stock: false }] };
    expect(resolveOrderItems([{ id: 3, option_id: 'a3', quantity: 1 }], [allOut]).ok).toBe(false);
  });

  it('0원 상품은 판매 중이어도 주문되지 않는다', () => {
    expect(resolveOrderItems([{ id: 4, quantity: 1 }], [{ ...postcard, price: 0 }]).ok).toBe(false);
    const zeroOption = { ...poster, options: [...(poster.options as object[]), { id: 'free', label: '무료?', price: 0, in_stock: true }] };
    expect(resolveOrderItems([{ id: 3, option_id: 'free', quantity: 1 }], [zeroOption]).ok).toBe(false);
  });

  it('같은 줄이 두 번 오면 합치고, 합친 수량도 99를 넘지 못한다', () => {
    const merged = resolveOrderItems(
      [
        { id: 3, option_id: 'a3', quantity: 2 },
        { id: 3, option_id: 'a3', quantity: 3 },
        { id: 3, option_id: 'a2', quantity: 1 },
      ],
      [poster],
    );
    expect(merged.ok && merged.items.map(item => [item.option_id, item.quantity])).toEqual([
      ['a3', 5],
      ['a2', 1],
    ]);
    expect(
      resolveOrderItems(
        [
          { id: 4, quantity: 60 },
          { id: 4, quantity: 60 },
        ],
        [postcard],
      ).ok,
    ).toBe(false);
  });

  it('마이그레이션 전의 행(status·options 없음)은 예전 규칙으로 판다', () => {
    const legacy = { id: 4, name: '엽서', price: 2000, in_stock: true };
    expect(resolveOrderItems([{ id: 4, quantity: 1 }], [legacy])).toMatchObject({ ok: true, total: 2000 });
    expect(resolveOrderItems([{ id: 4, quantity: 1 }], [{ ...legacy, in_stock: false }]).ok).toBe(false);
  });
});

describe('orderItemLabel()', () => {
  it('옵션이 있으면 이름 뒤에, 옛 주문은 이름만', () => {
    expect(orderItemLabel({ name: '숲 포스터', option_label: 'A3 · 매트지' })).toBe('숲 포스터 · A3 · 매트지');
    expect(orderItemLabel({ name: '엽서' })).toBe('엽서');
    expect(orderItemLabel({ name: '엽서', option_label: null })).toBe('엽서');
  });
});
