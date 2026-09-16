import { describe, expect, it } from 'vitest';
import {
  buildBuyerEmail,
  buildOwnerEmail,
  buildShippingEmail,
  escapeHtml,
  type EmailOrder,
} from '@/lib/order-email';

const order: EmailOrder = {
  id: 12,
  name: '<img src=x onerror=alert(1)>',
  email: 'buyer@example.com',
  phone: null,
  zipcode: '04524',
  address: '서울시 중구 & 어딘가',
  note: null,
  items: [{ id: 1, name: 'Print "A3"', price: 30000, quantity: 2 }],
  total_price: 60000,
};

describe('order-email', () => {
  it('escapeHtml', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });

  it('고객 입력은 어느 메일에서도 태그로 살아나지 않는다', () => {
    for (const message of [
      buildBuyerEmail(order),
      buildOwnerEmail(order),
      buildShippingEmail(order, { carrier: '<b>CJ</b>', trackingNumber: '<script>' }),
    ]) {
      expect(message.html).not.toContain('<img src=x');
      expect(message.html).not.toContain('<script>');
      expect(message.html).not.toContain('<b>CJ</b>');
    }
  });

  it('받는 사람과 제목', () => {
    expect(buildBuyerEmail(order)).toMatchObject({ to: 'buyer@example.com', subject: '[phorage] 주문 접수 확인 — #12' });
    expect(buildShippingEmail(order, { carrier: null, trackingNumber: '1' })).toMatchObject({
      to: 'buyer@example.com',
      subject: '[phorage] 배송 시작 안내 — #12',
    });
    expect(buildOwnerEmail(order).subject).toContain('#12');
  });

  it('옵션을 고른 줄은 옵션 이름을 같이 적고(이스케이프), 옛 주문은 이름만', () => {
    const withOption: EmailOrder = {
      ...order,
      items: [
        { id: 3, name: '숲 포스터', option_id: 'a3', option_label: 'A3 <매트지>', price: 38000, quantity: 1 },
        { id: 1, name: '엽서', price: 2000, quantity: 2 },
      ],
    };
    for (const message of [buildBuyerEmail(withOption), buildOwnerEmail(withOption)]) {
      expect(message.html).toContain('숲 포스터 · A3 &lt;매트지&gt;');
      expect(message.html).not.toContain('<매트지>');
      expect(message.html).toContain('엽서');
    }
  });

  it('금액과 우편번호가 본문에 들어간다', () => {
    expect(buildBuyerEmail(order).html).toContain('₩ 60,000');
    expect(buildOwnerEmail(order).html).toContain('[04524]');
    expect(buildShippingEmail(order, { carrier: 'CJ대한통운', trackingNumber: '5555' }).html).toContain(
      'CJ대한통운 · 5555',
    );
  });
});
