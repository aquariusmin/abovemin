/**
 * 주문 목록 → CSV. 관리 화면에서 지금 필터에 걸린 주문을 내려받는 데 쓴다.
 *
 * 받는 쪽은 사실상 한국어 Excel이다. 그래서 세 가지를 지킨다.
 *  1. **UTF-8 BOM.** 없으면 Excel이 CP949로 읽어 한글이 전부 깨진다.
 *  2. **RFC 4180 이스케이프.** 쉼표·따옴표·줄바꿈이 든 칸은 따옴표로 감싸고
 *     안의 따옴표는 두 번 쓴다. 주소와 요청사항에는 셋 다 흔하다.
 *  3. **수식 주입 차단.** 이름·주소·메모는 고객이 입력한 값이다. `=`, `+`,
 *     `-`, `@`로 시작하는 칸을 Excel은 수식으로 실행한다(`=HYPERLINK(...)`).
 *     앞에 `'`를 붙여 글자로 읽게 한다 — OWASP의 CSV Injection 권고.
 *
 * 줄 끝은 CRLF다. RFC 4180의 규정이고, 칸 안의 LF 줄바꿈과 구분된다.
 */

export interface CsvOrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CsvOrder {
  id: number;
  created_at: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  zipcode: string | null;
  address: string;
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

/** 한 칸. 숫자는 그대로(수식 위험이 없고, Excel이 숫자로 읽어야 합계를 낸다). */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';

  let text = value;
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * 주문 시각을 한국 시간으로 적는다. 서버·브라우저의 시간대와 상관없이 같은
 * 결과가 나와야 한다 — 같은 파일을 두 번 받았는데 시각이 다르면 안 된다.
 */
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
  return (items ?? []).map(item => `${item.name} ×${item.quantity}`).join(' / ');
}

export function ordersToCsv(orders: CsvOrder[]): string {
  const rows = orders.map(order => [
    order.id,
    formatKst(order.created_at),
    STATUS_LABELS[order.status] ?? order.status,
    order.name,
    order.email,
    order.phone,
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
