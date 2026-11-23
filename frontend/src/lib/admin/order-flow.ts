import type { DeliveryMethod } from '@/lib/delivery';

// 상태는 앞으로만 간다. 대면 전달은 shipped를 건너뛰고 confirmed → delivered로 간다.

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUS_VALUES.includes(value as OrderStatus);
}

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
  label: string;
}

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

// 계좌 설정이 없으면 계좌 줄을 뺀다 — "계좌: 미정"을 손님에게 보내지 않는다.
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

export function dialable(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
  return /\d/.test(cleaned) ? cleaned : null;
}

// 안드로이드와 최근 iOS가 모두 `?body=`를 읽는다.
export function smsHref(phone: string, body: string): string {
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
}
