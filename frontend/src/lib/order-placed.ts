/**
 * 주문 완료 화면이 쓰는 것: 서버 응답의 모양, 화면에 남길 요약, 그 요약을
 * 새로고침 너머로 들고 가는 `sessionStorage` 읽기·쓰기.
 *
 * 왜 있나 — 완료 화면은 예전에 이메일과 금액만 보여 줬다. 확인 메일이 스팸함에
 * 들어가거나 늦으면 손님은 어디로 얼마를 보낼지, 문의할 때 무슨 번호를 댈지
 * 알 길이 없었다. 그리고 새로고침 한 번이면 장바구니가 이미 비어 있어 `/cart`로
 * 튕겼다.
 *
 * 서버(`api/orders`)와 클라이언트(`cart/checkout`)가 같이 읽는 파일이라
 * 환경변수도, 서버 전용 모듈도 여기서 부르지 않는다.
 */

/** `POST /api/orders`의 성공 응답. */
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

/**
 * 완료 화면에 남기는 것의 전부. 이름·주소·전화·주문 항목은 일부러 없다 — 이
 * 값은 탭이 닫힐 때까지 브라우저에 남는다.
 */
export interface PlacedOrder {
  /** 응답에서 번호를 읽지 못했으면 `null` — 화면은 번호 줄을 뺀다. */
  orderId: number | null;
  /** 입금할 금액. 서버가 DB 가격으로 다시 계산한 값이다. */
  total: number;
  /** 설정되지 않았으면 `null` — 화면은 메일을 보라고 안내한다. */
  bankInfo: string | null;
  email: string;
}

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isOrderId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const bankInfoOf = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/**
 * 성공 응답에서 요약을 만든다. 본문이 깨졌거나 필드가 빠져도 주문은 이미
 * 들어갔으므로 던지지 않는다: 금액은 장바구니 합계로, 나머지는 `null`로 물러난다.
 */
export function placedOrderFromResponse(body: unknown, fallback: { email: string; cartTotal: number }): PlacedOrder {
  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return {
    orderId: isOrderId(data.orderId) ? data.orderId : null,
    total: isAmount(data.total_price) ? data.total_price : fallback.cartTotal,
    bankInfo: bankInfoOf(data.bank_info),
    email: fallback.email,
  };
}

export const PLACED_ORDER_KEY = 'phorage-placed-order';

/** 저장된 문자열을 요약으로. 모양이 다르면 `null` — 남의 값을 화면에 올리지 않는다. */
export function parsePlacedOrder(raw: string | null | undefined): PlacedOrder | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { orderId, total, bankInfo, email } = data as Record<string, unknown>;
  if (!isAmount(total) || typeof email !== 'string' || !email) return null;
  return {
    orderId: isOrderId(orderId) ? orderId : null,
    total,
    bankInfo: bankInfoOf(bankInfo),
    email,
  };
}

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;
type RemoveStore = Pick<Storage, 'removeItem'>;

// 저장소는 없을 수도(SSR), 막혀 있을 수도(사파리 개인정보 보호, 용량 초과) 있다.
// 어느 쪽이든 완료 화면 자체는 떠야 하므로 전부 조용히 물러난다.
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
  // 필드를 하나씩 옮겨 적는다 — 호출하는 쪽이 더 넓은 객체를 넘겨도 네 값만 남는다.
  const summary: PlacedOrder = {
    orderId: order.orderId,
    total: order.total,
    bankInfo: order.bankInfo,
    email: order.email,
  };
  try {
    store?.setItem(PLACED_ORDER_KEY, JSON.stringify(summary));
  } catch {
    // 저장 실패는 "새로고침하면 사라진다"일 뿐이다.
  }
}

export function clearPlacedOrder(store: RemoveStore | null = sessionStore()): void {
  try {
    store?.removeItem(PLACED_ORDER_KEY);
  } catch {
    // 위와 같다.
  }
}
