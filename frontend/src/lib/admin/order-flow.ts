import type { DeliveryMethod } from '@/lib/delivery';

/**
 * 관리 화면 주문 탭의 흐름 — 수령 방법마다 다음 단계와 이름, 손님에게 보낼 문자.
 * 화면 없이 판단만 한다(`OrdersTab`이 쓰고, `admin-order-flow.test.ts`가 덮는다).
 *
 * 상태 값은 DB 그대로다(`pending`·`confirmed`·`shipped`·`delivered`·`cancelled`,
 * `lib/admin/schemas.ts`의 `ORDER_STATUSES`). 대면 전달은 `shipped`를 거치지 않고
 * `confirmed`에서 바로 `delivered`로 간다 — 이름만 "전달 완료"로 다르게 보인다.
 * 그래서 새 상태 값도, 마이그레이션도 없다.
 *
 * 상태는 앞으로만 간다. 되돌리기가 없는 이유: 손님에게 이미 "보냈다"고 알린 주문을
 * 클릭 한 번으로 "입금 대기"로 돌리는 것은 화면이 쉽게 해 줄 일이 아니다.
 */

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUS_VALUES.includes(value as OrderStatus);
}

/** 상태의 이름. 대면 전달은 "배송"이라는 말을 쓰지 않는다. */
export function statusLabel(status: OrderStatus, delivery: DeliveryMethod): string {
  switch (status) {
    case 'pending':
      return '입금 대기';
    case 'confirmed':
      return delivery === 'pickup' ? '전달 준비' : '발송 준비';
    case 'shipped':
      return '배송 중';
    case 'delivered':
      return delivery === 'pickup' ? '전달 완료' : '배송 완료';
    case 'cancelled':
      return '취소';
  }
}

export interface NextStep {
  status: OrderStatus;
  /** 버튼에 적는 말. */
  label: string;
}

/** 지금 상태에서 누를 다음 단계. 끝난 주문은 null. */
export function nextStep(status: OrderStatus, delivery: DeliveryMethod): NextStep | null {
  switch (status) {
    case 'pending':
      return { status: 'confirmed', label: '입금 확인' };
    case 'confirmed':
      return delivery === 'pickup'
        ? { status: 'delivered', label: '전달 완료' }
        : { status: 'shipped', label: '배송 시작' };
    case 'shipped':
      return { status: 'delivered', label: '배송 완료' };
    default:
      return null;
  }
}

export function isOpen(status: OrderStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled';
}

/**
 * 목록의 단계 필터. 운영자가 하는 일의 순서다 — 입금을 맞춰 보고, 준비해서
 * 보내거나 전하고, 끝난다. `prepare`는 입금이 확인된 주문 전부(택배·대면)이고,
 * 어느 쪽인지는 카드의 칩과 수령 방법 필터가 가른다.
 */
export const STAGES = ['pending', 'prepare', 'shipped', 'done', 'cancelled'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  pending: '입금 대기',
  prepare: '준비 중',
  shipped: '배송 중',
  done: '완료',
  cancelled: '취소',
};

export function stageOf(status: OrderStatus): Stage {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'prepare';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'done';
    case 'cancelled':
      return 'cancelled';
  }
}

/** 개요 탭의 링크(`?status=confirmed` 등)를 단계로. 모르는 값은 null(= 전체). */
export function stageFromParam(param: string | null): Stage | null {
  if (param === null) return null;
  if ((STAGES as readonly string[]).includes(param)) return param as Stage;
  return isOrderStatus(param) ? stageOf(param) : null;
}

export interface SmsOrder {
  id: number;
  name: string;
  total_price: number;
  status: OrderStatus;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
}

/**
 * 지금 단계에서 손님에게 보낼 문자. 이메일을 받지 않으므로 운영자가 직접 보낸다 —
 * 화면은 문구만 만들어 준다(복사하거나 문자 앱으로 연다). 보낼 말이 없는 단계는 null.
 *
 * 입금 안내에 계좌를 넣는다(`BANK_INFO`, 서버가 목록과 같이 내려준다). 설정이 없으면
 * 계좌 줄을 뺀다 — "계좌: 미정" 같은 말을 손님에게 보내지 않는다.
 */
export function smsBody(order: SmsOrder, delivery: DeliveryMethod, bankInfo: string | null): string | null {
  const head = `[phorage] ${order.name}님, 주문 #${order.id}`;
  const amount = `₩${order.total_price.toLocaleString('ko-KR')}`;
  switch (order.status) {
    case 'pending':
      return bankInfo
        ? `${head} 접수되었습니다. ${amount}을 ${bankInfo}로 입금해 주세요.`
        : `${head} 접수되었습니다. 입금하실 금액은 ${amount}입니다.`;
    case 'confirmed':
      return delivery === 'pickup'
        ? `${head} 입금 확인했습니다. 전달 일정은 따로 연락드리겠습니다.`
        : `${head} 입금 확인했습니다. 준비되는 대로 발송하겠습니다.`;
    case 'shipped': {
      const tracking = [order.tracking_carrier, order.tracking_number].filter(Boolean).join(' ');
      return tracking ? `${head} 발송했습니다. 송장: ${tracking}` : `${head} 발송했습니다.`;
    }
    default:
      return null;
  }
}

/** 전화번호에서 숫자와 `+`만 — `tel:`·`sms:` 주소에 쓴다. 숫자가 없으면 null. */
export function dialable(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
  return /\d/.test(cleaned) ? cleaned : null;
}

/** 문자 앱을 여는 주소. 안드로이드와 최근 iOS가 모두 `?body=`를 읽는다. */
export function smsHref(phone: string, body: string): string {
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
}
