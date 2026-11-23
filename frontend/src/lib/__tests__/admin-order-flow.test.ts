import { describe, expect, it } from 'vitest';
import {
  dialable,
  nextStep,
  smsBody,
  smsHref,
  stageFromParam,
  stageOf,
  statusLabel,
  type SmsOrder,
} from '@/lib/admin/order-flow';

describe('nextStep', () => {
  it('택배: 입금 확인 → 배송 시작 → 배송 완료', () => {
    expect(nextStep('pending', 'parcel')).toEqual({ status: 'confirmed', label: '입금 확인' });
    expect(nextStep('confirmed', 'parcel')).toEqual({ status: 'shipped', label: '배송 시작' });
    expect(nextStep('shipped', 'parcel')).toEqual({ status: 'delivered', label: '배송 완료' });
    expect(nextStep('delivered', 'parcel')).toBeNull();
  });

  it('대면 전달: 배송 단계 없이 입금 확인 → 전달 완료', () => {
    expect(nextStep('pending', 'pickup')).toEqual({ status: 'confirmed', label: '입금 확인' });
    expect(nextStep('confirmed', 'pickup')).toEqual({ status: 'delivered', label: '전달 완료' });
    expect(nextStep('delivered', 'pickup')).toBeNull();
    expect(nextStep('cancelled', 'pickup')).toBeNull();
  });
});

describe('statusLabel', () => {
  it('대면 전달은 "배송"이라고 부르지 않는다', () => {
    expect(statusLabel('confirmed', 'parcel')).toBe('발송 준비');
    expect(statusLabel('confirmed', 'pickup')).toBe('전달 준비');
    expect(statusLabel('delivered', 'parcel')).toBe('배송 완료');
    expect(statusLabel('delivered', 'pickup')).toBe('전달 완료');
  });
});

describe('stages', () => {
  it('상태를 단계로 묶고, 개요 탭의 옛 링크(상태 값)도 읽는다', () => {
    expect(stageOf('confirmed')).toBe('prepare');
    expect(stageOf('delivered')).toBe('done');
    expect(stageFromParam('confirmed')).toBe('prepare');
    expect(stageFromParam('pending')).toBe('pending');
    expect(stageFromParam('done')).toBe('done');
    expect(stageFromParam('nope')).toBeNull();
    expect(stageFromParam(null)).toBeNull();
  });
});

describe('smsBody', () => {
  const order: SmsOrder = { id: 12, name: '홍길동', total_price: 13000, status: 'pending' };

  it('입금 대기: 금액과 계좌. 계좌가 설정되지 않았으면 계좌 없이', () => {
    expect(smsBody(order, 'parcel', '은행 000-00 (예금주)')).toBe(
      '[phorage] 홍길동님, 주문 #12 접수되었습니다. ₩13,000을 은행 000-00 (예금주)로 입금해 주세요.',
    );
    expect(smsBody(order, 'parcel', null)).toBe('[phorage] 홍길동님, 주문 #12 접수되었습니다. 입금하실 금액은 ₩13,000입니다.');
  });

  it('입금 확인 뒤는 수령 방법에 따라, 발송 뒤는 송장과 함께', () => {
    expect(smsBody({ ...order, status: 'confirmed' }, 'pickup', null)).toContain('전달 일정은 따로 연락드리겠습니다');
    expect(smsBody({ ...order, status: 'confirmed' }, 'parcel', null)).toContain('발송하겠습니다');
    expect(
      smsBody({ ...order, status: 'shipped', tracking_carrier: 'CJ대한통운', tracking_number: '1234' }, 'parcel', null),
    ).toBe('[phorage] 홍길동님, 주문 #12 발송했습니다. 송장: CJ대한통운 1234');
  });

  it('끝난 주문에는 보낼 말이 없다', () => {
    expect(smsBody({ ...order, status: 'delivered' }, 'parcel', null)).toBeNull();
    expect(smsBody({ ...order, status: 'cancelled' }, 'pickup', null)).toBeNull();
  });
});

describe('dialable / smsHref', () => {
  it('번호는 숫자와 +만 남기고, 숫자가 없으면 null', () => {
    expect(dialable('010-1234-5678')).toBe('01012345678');
    expect(dialable('+82 10 1234 5678')).toBe('+821012345678');
    expect(dialable('없음')).toBeNull();
    expect(dialable(null)).toBeNull();
  });

  it('본문은 인코딩한다', () => {
    expect(smsHref('01012345678', '주문 #1 & 확인')).toBe(`sms:01012345678?body=${encodeURIComponent('주문 #1 & 확인')}`);
  });
});
