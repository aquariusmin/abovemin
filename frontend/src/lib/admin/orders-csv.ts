import { orderItemLabel, type OrderItemRecord } from '@/lib/order-items';
import { DELIVERY_LABEL, deliveryMethodFromRow } from '@/lib/delivery';

// 한국어 Excel용: UTF-8 BOM, RFC 4180 이스케이프, CRLF, 수식 주입 차단(=,+,-,@ 앞에 ').

export type CsvOrderItem = OrderItemRecord;

export interface CsvOrder {
  id: number;
  created_at: string;
  status: string;
  name: string;
  email: string | null;
  phone: string | null;
  zipcode: string | null;
  address: string;
  // 없으면 택배(컬럼 전의 주문).
  delivery_method?: string | null;
  note: string | null;
  items: CsvOrderItem[] | null;
  total_price: number;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  admin_memo?: string | null;
}

export const CSV_BOM = '﻿';

const STATUS_LABELS: Record<string, string> = {
  pending: '입금 대기',
  confirmed: '입금 확인',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소',
};

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// 숫자는 그대로 둔다: 수식 위험이 없고, Excel이 합계를 내야 한다.
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';

  let text = value;
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// 서버·브라우저 시간대와 상관없이 한국 시간으로 적는다.
export function formatKst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const HEADERS = [
  '주문번호',
  '주문일시(KST)',
  '상태',
  '이름',
  '이메일',
  '연락처',
  '수령 방법',
  '우편번호',
  '주소',
  '요청사항',
  '상품',
  '합계(원)',
  '택배사',
  '송장번호',
  '관리자 메모',
];

function itemsSummary(items: CsvOrderItem[] | null): string {
  return (items ?? []).map(item => `${orderItemLabel(item)} ×${item.quantity}`).join(' / ');
}

export function ordersToCsv(orders: CsvOrder[]): string {
  const rows = orders.map(order => [
    order.id,
    formatKst(order.created_at),
    STATUS_LABELS[order.status] ?? order.status,
    order.name,
    order.email,
    order.phone,
    DELIVERY_LABEL[deliveryMethodFromRow(order)],
    order.zipcode,
    order.address,
    order.note,
    itemsSummary(order.items),
    order.total_price,
    order.tracking_carrier,
    order.tracking_number,
    order.admin_memo,
  ]);
  const lines = [HEADERS, ...rows].map(row => row.map(csvCell).join(','));
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}
