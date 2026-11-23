// 서버와 클라이언트가 같이 읽는다 — 환경변수도 서버 전용 모듈도 부르지 않는다.
export interface OrderPlacedBody {
  success: true;
  orderId: number;
  total_price: number;
  /** `BANK_INFO`가 설정돼 있을 때만. 없으면 키째 빠진다. */
  bank_info?: string;
}

export function orderPlacedBody(orderId: number, totalPrice: number, bankInfo: string | null): OrderPlacedBody {
  return {
    success: true,
    orderId,
    total_price: totalPrice,
    ...(bankInfo ? { bank_info: bankInfo } : {}),
  };
}

// 이름·주소·전화·주문 항목은 일부러 저장하지 않는다 — 탭이 닫힐 때까지 브라우저에 남는다.
export interface PlacedOrder {
  orderId: number | null;
  /** 서버가 DB 가격으로 다시 계산한 값이다. */
  total: number;
  bankInfo: string | null;
}

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isOrderId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const bankInfoOf = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

// 주문은 이미 들어갔으므로 던지지 않는다: 금액은 장바구니 합계로, 나머지는 `null`로 물러난다.
export function placedOrderFromResponse(body: unknown, fallback: { cartTotal: number }): PlacedOrder {
  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return {
    orderId: isOrderId(data.orderId) ? data.orderId : null,
    total: isAmount(data.total_price) ? data.total_price : fallback.cartTotal,
    bankInfo: bankInfoOf(data.bank_info),
  };
}

export const PLACED_ORDER_KEY = 'phorage-placed-order';

// 모양이 다르면 `null` — 남의 값을 화면에 올리지 않는다.
export function parsePlacedOrder(raw: string | null | undefined): PlacedOrder | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { orderId, total, bankInfo } = data as Record<string, unknown>;
  if (!isAmount(total)) return null;
  return {
    orderId: isOrderId(orderId) ? orderId : null,
    total,
    bankInfo: bankInfoOf(bankInfo),
  };
}

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;
type RemoveStore = Pick<Storage, 'removeItem'>;

// 저장소는 없거나(SSR) 막혀 있을 수 있다 — 완료 화면은 떠야 하므로 조용히 물러난다.
function sessionStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPlacedOrder(store: ReadStore | null = sessionStore()): PlacedOrder | null {
  try {
    return parsePlacedOrder(store?.getItem(PLACED_ORDER_KEY));
  } catch {
    return null;
  }
}

export function writePlacedOrder(order: PlacedOrder, store: WriteStore | null = sessionStore()): void {
  // 필드를 하나씩 옮겨 적는다 — 더 넓은 객체를 넘겨도 세 값만 남는다.
  const summary: PlacedOrder = {
    orderId: order.orderId,
    total: order.total,
    bankInfo: order.bankInfo,
  };
  try {
    store?.setItem(PLACED_ORDER_KEY, JSON.stringify(summary));
  } catch {
  }
}

export function clearPlacedOrder(store: RemoveStore | null = sessionStore()): void {
  try {
    store?.removeItem(PLACED_ORDER_KEY);
  } catch {
  }
}
