import { describe, expect, it } from 'vitest';
import {
  PLACED_ORDER_KEY,
  clearPlacedOrder,
  orderPlacedBody,
  parsePlacedOrder,
  placedOrderFromResponse,
  readPlacedOrder,
  writePlacedOrder,
  type PlacedOrder,
} from '@/lib/order-placed';

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const throwingStore = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('quota'); },
  removeItem: () => { throw new Error('blocked'); },
};

const placed: PlacedOrder = { orderId: 41, total: 76000, bankInfo: '은행 000-00 (예금주)', email: 'buyer@example.com' };

describe('orderPlacedBody', () => {
  it('계좌 정보가 있으면 싣는다', () => {
    expect(orderPlacedBody(41, 76000, '은행 000-00')).toEqual({
      success: true,
      orderId: 41,
      total_price: 76000,
      bank_info: '은행 000-00',
    });
  });

  it('계좌 정보가 없으면 키째 뺀다 — null이나 빈 문자열을 보내지 않는다', () => {
    expect(orderPlacedBody(41, 76000, null)).toEqual({ success: true, orderId: 41, total_price: 76000 });
    expect('bank_info' in orderPlacedBody(41, 76000, null)).toBe(false);
    expect('bank_info' in orderPlacedBody(41, 76000, '')).toBe(false);
  });
});

describe('placedOrderFromResponse', () => {
  const fallback = { email: 'buyer@example.com', cartTotal: 70000 };

  it('서버의 번호·금액·계좌를 쓴다. 금액은 장바구니 합계가 아니라 서버 값이다', () => {
    expect(placedOrderFromResponse(orderPlacedBody(41, 76000, '은행 000-00'), fallback)).toEqual({
      orderId: 41,
      total: 76000,
      bankInfo: '은행 000-00',
      email: 'buyer@example.com',
    });
  });

  it('계좌 정보가 없는 응답은 bankInfo가 null이다', () => {
    expect(placedOrderFromResponse(orderPlacedBody(41, 76000, null), fallback).bankInfo).toBeNull();
    expect(placedOrderFromResponse({ success: true, orderId: 41, total_price: 1, bank_info: '   ' }, fallback).bankInfo).toBeNull();
  });

  it('본문이 깨졌어도 던지지 않는다 — 금액은 장바구니 합계로 물러난다', () => {
    for (const body of [null, undefined, 'ok', 3, [], { orderId: '41', total_price: '76000', bank_info: 7 }]) {
      expect(placedOrderFromResponse(body, fallback)).toEqual({
        orderId: null,
        total: 70000,
        bankInfo: null,
        email: 'buyer@example.com',
      });
    }
  });

  it('멱등 재응답처럼 금액이 0이어도 서버 값을 쓴다', () => {
    expect(placedOrderFromResponse({ success: true, orderId: 41, total_price: 0 }, fallback).total).toBe(0);
  });
});

describe('placed order storage', () => {
  it('쓴 것을 그대로 읽는다', () => {
    const store = memoryStore();
    writePlacedOrder(placed, store);
    expect(readPlacedOrder(store)).toEqual(placed);
  });

  it('번호·금액·계좌·이메일 말고는 저장하지 않는다', () => {
    const store = memoryStore();
    const wider = { ...placed, name: '홍길동', address: '서울시 어딘가', phone: '010-0000-0000', cartTotal: 1 };
    writePlacedOrder(wider, store);
    expect(Object.keys(JSON.parse(store.data.get(PLACED_ORDER_KEY)!)).sort()).toEqual(['bankInfo', 'email', 'orderId', 'total']);
  });

  it('지우면 없다', () => {
    const store = memoryStore();
    writePlacedOrder(placed, store);
    clearPlacedOrder(store);
    expect(readPlacedOrder(store)).toBeNull();
    expect(store.data.has(PLACED_ORDER_KEY)).toBe(false);
  });

  it('없거나 모양이 다른 값은 null이다', () => {
    expect(readPlacedOrder(memoryStore())).toBeNull();
    for (const raw of [
      '',
      'not json',
      'null',
      '[]',
      '"text"',
      JSON.stringify({ orderId: 41, bankInfo: null, email: 'a@b.co' }), // 금액 없음
      JSON.stringify({ orderId: 41, total: '76000', bankInfo: null, email: 'a@b.co' }),
      JSON.stringify({ orderId: 41, total: -1, bankInfo: null, email: 'a@b.co' }),
      JSON.stringify({ orderId: 41, total: 76000, bankInfo: null }), // 이메일 없음
      JSON.stringify({ orderId: 41, total: 76000, bankInfo: null, email: '' }),
    ]) {
      expect(parsePlacedOrder(raw), raw).toBeNull();
    }
  });

  it('번호와 계좌는 없어도 된다', () => {
    expect(parsePlacedOrder(JSON.stringify({ total: 76000, email: 'a@b.co' }))).toEqual({
      orderId: null,
      total: 76000,
      bankInfo: null,
      email: 'a@b.co',
    });
    expect(parsePlacedOrder(JSON.stringify({ orderId: 1.5, total: 76000, bankInfo: 3, email: 'a@b.co' }))).toEqual({
      orderId: null,
      total: 76000,
      bankInfo: null,
      email: 'a@b.co',
    });
  });

  it('저장소가 없거나 막혀 있어도 던지지 않는다', () => {
    expect(readPlacedOrder(null)).toBeNull();
    expect(() => writePlacedOrder(placed, null)).not.toThrow();
    expect(() => clearPlacedOrder(null)).not.toThrow();
    expect(readPlacedOrder(throwingStore)).toBeNull();
    expect(() => writePlacedOrder(placed, throwingStore)).not.toThrow();
    expect(() => clearPlacedOrder(throwingStore)).not.toThrow();
  });
});
