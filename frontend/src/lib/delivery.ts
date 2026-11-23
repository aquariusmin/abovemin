/**
 * 주문의 수령 방법. 체크아웃·주문 API·관리 화면·메일·CSV가 같이 본다.
 *
 *  - `parcel` — 택배. 주소가 필요하다.
 *  - `pickup` — 대면 전달. 주소를 받지 않는다. 만날 곳과 때는 연락처로 정한다.
 *
 * 저장은 `orders.delivery_method`(`20261123010000_orders_delivery_method.sql`).
 * 이 컬럼이 생기기 전의 주문, 그리고 컬럼이 아직 없을 때 들어온 택배 주문은
 * 값이 없다 — 그때까지 주문은 전부 택배였으므로 `parcel`로 읽는다.
 */
export const DELIVERY_METHODS = ['parcel', 'pickup'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  parcel: '택배',
  pickup: '대면 전달',
};

/** 저장된 값(없거나 모르는 값 포함)을 수령 방법으로. 모르면 택배다. */
export function deliveryMethodOf(value: unknown): DeliveryMethod {
  return value === 'pickup' ? 'pickup' : 'parcel';
}

/**
 * 컬럼이 아직 없을 때 대면 전달을 잃지 않으려고 메모 앞에 붙이는 표시.
 * 관리 화면은 이 표시가 있는 메모도 대면 전달로 읽는다(`deliveryMethodFromRow`).
 */
export const PICKUP_NOTE_TAG = '[대면 전달]';

export function noteWithPickupTag(note: string | null): string {
  return note ? `${PICKUP_NOTE_TAG} ${note}` : PICKUP_NOTE_TAG;
}

/** 주문 행에서 수령 방법을 읽는다. 컬럼이 없던 때의 대면 전달은 메모의 표시로 안다. */
export function deliveryMethodFromRow(row: { delivery_method?: unknown; note?: string | null }): DeliveryMethod {
  if (row.delivery_method !== undefined && row.delivery_method !== null) return deliveryMethodOf(row.delivery_method);
  return row.note?.startsWith(PICKUP_NOTE_TAG) ? 'pickup' : 'parcel';
}
