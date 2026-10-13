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

  it('합친 수량이 딱 99면 받고, 합계는 합친 줄로 낸다', () => {
    const result = resolveOrderItems(
      [
        { id: 4, quantity: 50 },
        { id: 4, quantity: 49 },
      ],
      [postcard],
    );
    expect(result).toMatchObject({ ok: true, total: 99 * 2000 });
    expect(result.ok && result.items).toHaveLength(1);
  });

  it('옵션 없음은 키가 없든 null이든 같은 줄이다 — 표기를 바꿔 상한을 넘을 수 없다', () => {
    const split = resolveOrderItems(
      [
        { id: 4, quantity: 50 },
        { id: 4, option_id: null, quantity: 50 },
      ],
      [postcard],
    );
    expect(split.ok).toBe(false);
  });

  it('줄이 여럿이어도 상한은 줄마다 따로다', () => {
    // 다른 옵션은 다른 물건 — 합쳐서 99를 넘는 것은 괜찮다.
    const result = resolveOrderItems(
      [
        { id: 3, option_id: 'a3', quantity: 99 },
        { id: 3, option_id: 'a2', quantity: 99 },
      ],
      [poster],
    );
    expect(result.ok).toBe(true);
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
    // 추가 상품 줄: 이름은 부모 상품, 뒤에 "추가: …".
    expect(orderItemLabel({ name: '2027 Calendar', addon_label: '거치대' })).toBe('2027 Calendar · 추가: 거치대');
    expect(orderItemLabel({ name: '2027 Calendar', option_label: null, addon_label: null })).toBe('2027 Calendar');
  });
});

/**
 * 추가 상품 줄의 불변식. 손님이 보낸 것은 (부모 상품 id, 추가 상품 id, 수량)뿐이고,
 * 이름·가격·"이 주문에 부모가 있는가"는 전부 서버가 본다.
 */
describe('resolveOrderItems() — 추가 상품', () => {
  const calendar: OrderableProduct = {
    id: 9,
    name: '2027 Calendar',
    price: 18000,
    in_stock: true,
    status: 'available',
    options: [],
    addons: [
      { id: 'stand', label: '거치대', price: 3000, in_stock: true },
      { id: 'env', label: '봉투', price: 500, in_stock: false },
      { id: 'tbd', label: '미정', price: 0, in_stock: true },
    ],
  };
  const posterWithAddon: OrderableProduct = { ...poster, addons: [{ id: 'clip', label: '집게', price: 4000, in_stock: true }] };
  const error = (result: ReturnType<typeof resolveOrderItems>) => (result.ok ? null : result.error);

  it('이름과 가격을 DB의 addons에서 읽고, 합계에 넣는다', () => {
    const result = resolveOrderItems(
      [
        { id: 9, quantity: 2 },
        { id: 9, addon_id: 'stand', quantity: 1 },
      ],
      [calendar],
    );
    expect(result).toEqual({
      ok: true,
      items: [
        { id: 9, name: '2027 Calendar', option_id: null, option_label: null, price: 18000, quantity: 2 },
        { id: 9, name: '2027 Calendar', option_id: null, option_label: null, addon_id: 'stand', addon_label: '거치대', price: 3000, quantity: 1 },
      ],
      total: 18000 * 2 + 3000,
    });
  });

  it('추가 상품이 아닌 줄의 기록에는 addon 키가 없다 — 옛 주문과 같은 모양', () => {
    const result = resolveOrderItems([{ id: 9, quantity: 1 }], [calendar]);
    expect(result.ok && Object.keys(result.items[0]).sort()).toEqual(['id', 'name', 'option_id', 'option_label', 'price', 'quantity']);
  });

  it('요청에 가격·이름이 섞여 와도 쓰지 않는다', () => {
    const tampered = [
      { id: 9, quantity: 1 },
      { id: 9, addon_id: 'stand', quantity: 1, price: 1, addon_label: '공짜', name: '공짜' },
    ];
    const result = resolveOrderItems(tampered, [calendar]);
    expect(result.ok && result.items[1]).toEqual({
      id: 9, name: '2027 Calendar', option_id: null, option_label: null, addon_id: 'stand', addon_label: '거치대', price: 3000, quantity: 1,
    });
    expect(result.ok && result.total).toBe(21000);
  });

  it('같은 주문에 부모 상품의 줄이 없으면 막는다', () => {
    const alone = resolveOrderItems([{ id: 9, addon_id: 'stand', quantity: 1 }], [calendar]);
    expect(error(alone)).toContain('함께 주문');
    // 다른 상품의 줄은 부모가 아니다.
    const otherParent = resolveOrderItems(
      [
        { id: 4, quantity: 1 },
        { id: 9, addon_id: 'stand', quantity: 1 },
      ],
      [calendar, postcard],
    );
    expect(error(otherParent)).toContain("'2027 Calendar'의 추가 상품");
  });

  it('부모가 초안·삭제·품절이면 막는다 — 부모 줄이 같이 와도', () => {
    const order = [
      { id: 9, quantity: 1 },
      { id: 9, addon_id: 'stand', quantity: 1 },
    ];
    expect(error(resolveOrderItems(order, []))).toContain('더 이상 판매하지 않는 상품');
    expect(error(resolveOrderItems(order, [{ ...calendar, status: 'draft' }]))).toContain('더 이상 판매하지 않는 상품');
    expect(error(resolveOrderItems(order, [{ ...calendar, status: 'sold_out' }]))).toContain('품절');
    // 부모 줄 없이 추가 상품만 와도 같은 이유로 막힌다(부모 상태가 먼저다).
    expect(error(resolveOrderItems([order[1]], [{ ...calendar, status: 'sold_out' }]))).toContain('품절');
  });

  it('부모 줄이 옵션 때문에 거절되면 주문 전체가 거절된다', () => {
    // 옵션 상품인데 부모 줄이 옵션을 고르지 않았다.
    const result = resolveOrderItems(
      [
        { id: 3, quantity: 1 },
        { id: 3, addon_id: 'clip', quantity: 1 },
      ],
      [posterWithAddon],
    );
    expect(error(result)).toContain('옵션을 골라야');
    // 추가 상품 줄이 먼저 와도 마찬가지.
    const reversed = resolveOrderItems(
      [
        { id: 3, addon_id: 'clip', quantity: 1 },
        { id: 3, option_id: 'a1', quantity: 1 },
      ],
      [posterWithAddon],
    );
    expect(error(reversed)).toContain('품절');
  });

  it('없는 추가 상품, 품절, 0원은 막는다', () => {
    const withAddon = (addon_id: string) =>
      resolveOrderItems(
        [
          { id: 9, quantity: 1 },
          { id: 9, addon_id, quantity: 1 },
        ],
        [calendar],
      );
    expect(error(withAddon('nope'))).toContain('추가 상품은 더 이상 판매하지 않습니다');
    expect(error(withAddon('env'))).toBe("'2027 Calendar · 추가: 봉투'은(는) 품절되었습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.");
    expect(error(withAddon('tbd'))).toContain('2027 Calendar · 추가: 미정');
    // 옵션 id를 추가 상품 id 자리에 넣어도 통하지 않는다.
    expect(
      error(
        resolveOrderItems(
          [
            { id: 3, option_id: 'a3', quantity: 1 },
            { id: 3, addon_id: 'a3', quantity: 1 },
          ],
          [posterWithAddon],
        ),
      ),
    ).toContain('추가 상품은 더 이상 판매하지 않습니다');
  });

  it('마이그레이션 전의 상품 행(addons 키 없음)에서는 추가 상품 줄만 막힌다', () => {
    const legacy: OrderableProduct = { id: 9, name: '2027 Calendar', price: 18000, in_stock: true, status: 'available', options: [] };
    const oldest: OrderableProduct = { id: 9, name: '2027 Calendar', price: 18000, in_stock: true };
    for (const row of [legacy, oldest]) {
      expect(resolveOrderItems([{ id: 9, quantity: 1 }], [row])).toMatchObject({ ok: true, total: 18000 });
      const result = resolveOrderItems(
        [
          { id: 9, quantity: 1 },
          { id: 9, addon_id: 'stand', quantity: 1 },
        ],
        [row],
      );
      expect(error(result)).toContain('추가 상품은 더 이상 판매하지 않습니다');
    }
    // 배열이 아닌 값이 들어 있어도 "없음"이다.
    expect(resolveOrderItems([{ id: 9, quantity: 1 }, { id: 9, addon_id: 'stand', quantity: 1 }], [{ ...legacy, addons: 'x' }]).ok).toBe(false);
  });

  it('옵션과 무관하다 — 어느 옵션의 줄이든 부모이고, 가격은 추가 상품의 것', () => {
    const result = resolveOrderItems(
      [
        { id: 3, option_id: 'a3', quantity: 1 },
        { id: 3, option_id: 'a2', quantity: 1 },
        { id: 3, addon_id: 'clip', quantity: 3 },
      ],
      [posterWithAddon],
    );
    expect(result.ok && result.items.map(item => [item.option_id, item.addon_id ?? null, item.price, item.quantity])).toEqual([
      ['a3', null, 38000, 1],
      ['a2', null, 58000, 1],
      [null, 'clip', 4000, 3],
    ]);
    expect(result.ok && result.total).toBe(38000 + 58000 + 4000 * 3);
  });

  it('같은 추가 상품 줄이 두 번 오면 합치고, 합친 수량도 99를 넘지 못한다', () => {
    const merged = resolveOrderItems(
      [
        { id: 9, addon_id: 'stand', quantity: 2 },
        { id: 9, quantity: 1 },
        { id: 9, addon_id: 'stand', quantity: 3 },
      ],
      [calendar],
    );
    expect(merged.ok && merged.items.map(item => [item.addon_id ?? null, item.quantity])).toEqual([
      [null, 1],
      ['stand', 5],
    ]);
    expect(merged.ok && merged.total).toBe(18000 + 3000 * 5);
    const over = resolveOrderItems(
      [
        { id: 9, quantity: 1 },
        { id: 9, addon_id: 'stand', quantity: 60 },
        { id: 9, addon_id: 'stand', quantity: 40 },
      ],
      [calendar],
    );
    expect(error(over)).toContain('99개까지');
    const exact = resolveOrderItems(
      [
        { id: 9, quantity: 1 },
        { id: 9, addon_id: 'stand', quantity: 99 },
      ],
      [calendar],
    );
    expect(exact).toMatchObject({ ok: true, total: 18000 + 3000 * 99 });
  });

  it('추가 상품 줄은 부모 줄 아래에 기록된다', () => {
    const result = resolveOrderItems(
      [
        { id: 9, addon_id: 'stand', quantity: 1 },
        { id: 4, quantity: 1 },
        { id: 9, quantity: 1 },
      ],
      [calendar, postcard],
    );
    expect(result.ok && result.items.map(item => orderItemLabel(item))).toEqual(['엽서', '2027 Calendar', '2027 Calendar · 추가: 거치대']);
  });
});
