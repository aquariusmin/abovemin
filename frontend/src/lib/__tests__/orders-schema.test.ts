import { describe, expect, it } from 'vitest';
import { OrderInput, type OrderInputValues } from '@/lib/orders-schema';

/**
 * 이 파일이 지키는 것: 체크아웃 폼이 보내는 모든 필드가 서버까지 살아서 간다.
 *
 * 우편번호가 몇 달 동안 버려진 이유는 zod의 기본 동작이 strip이기 때문이다 —
 * 모르는 키는 오류가 아니라 침묵이다. 타입 쪽은 `OrderInputValues`가 막고,
 * 런타임 쪽은 여기가 막는다.
 */
describe('OrderInput', () => {
  const valid: OrderInputValues = {
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-0000-0000',
    zipcode: '04524',
    address: '서울시 중구 세종대로 110',
    note: '문 앞에 놓아주세요',
    items: [{ id: 3, quantity: 2 }],
  };

  it('폼이 보내는 필드를 하나도 버리지 않는다', () => {
    const parsed = OrderInput.parse(valid);
    // 키 단위로 확인한다. `toMatchObject`는 사라진 키를 못 잡는다.
    expect(Object.keys(parsed).sort()).toEqual(
      ['address', 'email', 'items', 'name', 'note', 'phone', 'zipcode'].sort(),
    );
    expect(parsed.zipcode).toBe('04524');
  });

  it('선택 필드는 비워도 통과한다', () => {
    const { phone, zipcode, note, ...required } = valid;
    void phone; void zipcode; void note;
    expect(OrderInput.safeParse(required).success).toBe(true);
    expect(OrderInput.safeParse({ ...valid, phone: null, zipcode: null, note: null }).success).toBe(true);
  });

  it('장바구니 항목의 나머지 필드는 서버로 넘어가지 않는다', () => {
    // 카트는 이름·가격·이미지도 들고 있다. 가격은 서버가 products에서 다시
    // 읽으므로, 클라이언트가 보낸 값이 통과해서는 안 된다.
    const parsed = OrderInput.parse({
      ...valid,
      items: [{ id: 3, quantity: 1, name: '포스터', price: 999_999, image_url: 'x' }],
    });
    expect(parsed.items[0]).toEqual({ id: 3, quantity: 1 });
  });

  it('말이 안 되는 값은 막는다', () => {
    expect(OrderInput.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(OrderInput.safeParse({ ...valid, name: '' }).success).toBe(false);
    expect(OrderInput.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(OrderInput.safeParse({ ...valid, items: [{ id: 3, quantity: 0 }] }).success).toBe(false);
    expect(OrderInput.safeParse({ ...valid, items: [{ id: 3, quantity: 100 }] }).success).toBe(false);
    expect(OrderInput.safeParse({ ...valid, items: [{ id: -1, quantity: 1 }] }).success).toBe(false);
  });
});
