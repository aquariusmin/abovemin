// `orders.delivery_method`가 없던 때의 주문은 전부 택배였으므로 값이 없으면 `parcel`로 읽는다.
export const DELIVERY_METHODS = ['parcel', 'pickup'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  parcel: '택배',
  pickup: '대면 전달',
};

export function deliveryMethodOf(value: unknown): DeliveryMethod {
  return value === 'pickup' ? 'pickup' : 'parcel';
}

// 컬럼 마이그레이션 전에는 대면 전달을 메모 앞 이 표시로 남긴다(`deliveryMethodFromRow`가 읽음).
export const PICKUP_NOTE_TAG = '[대면 전달]';

export function noteWithPickupTag(note: string | null): string {
  return note ? `${PICKUP_NOTE_TAG} ${note}` : PICKUP_NOTE_TAG;
}

export function deliveryMethodFromRow(row: { delivery_method?: unknown; note?: string | null }): DeliveryMethod {
  if (row.delivery_method !== undefined && row.delivery_method !== null) return deliveryMethodOf(row.delivery_method);
  return row.note?.startsWith(PICKUP_NOTE_TAG) ? 'pickup' : 'parcel';
}
