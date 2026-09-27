/**
 * 장바구니 줄. 스토어(`store/cartStore.ts`)는 이 순수 함수들을 부르기만 한다.
 *
 * 줄의 열쇠는 **상품 id + 옵션 id**다. 같은 포스터의 A3와 A2는 다른 물건이라
 * 한 줄에 합치면 수량도 가격도 틀린다. 옵션이 없는 상품은 예전처럼 상품 id
 * 하나가 열쇠다 — 그래서 옵션이 생기기 전에 저장된 장바구니도 같은 열쇠로
 * 읽힌다(`migrateCartLines`).
 *
 * 줄에 든 가격·이름은 **화면 표시용**이다. 주문 API는 이 값을 받지 않고 DB에서
 * 다시 읽는다(`toOrderItems`가 id·옵션 id·수량만 넘긴다).
 */

export interface CartLine {
  key: string;
  id: number;
  option_id: string | null;
  option_label: string | null;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

export type NewCartLine = Omit<CartLine, 'key' | 'quantity'>;

/** 주문 스키마(`orders-schema.ts`)의 수량 상한과 같다. 넘기면 주문이 400이 된다. */
export const MAX_LINE_QUANTITY = 99;

export function cartLineKey(id: number, optionId?: string | null): string {
  // 옵션 id에는 `:`가 들어갈 수 없다(`OPTION_ID_RE`) — 열쇠가 모호해지지 않는다.
  return optionId ? `${id}:${optionId}` : String(id);
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(quantity)));
}

export function addLine(lines: readonly CartLine[], line: NewCartLine, quantity = 1): CartLine[] {
  const key = cartLineKey(line.id, line.option_id);
  const existing = lines.find(item => item.key === key);
  if (existing) {
    // 이름·가격은 새로 담는 순간의 값으로 갈아 끼운다 — 담아 둔 사이 관리자가
    // 가격을 고쳤다면 장바구니가 옛 가격을 계속 보여 줄 이유가 없다.
    return lines.map(item =>
      item.key === key ? { ...item, ...line, key, quantity: clampQuantity(item.quantity + quantity) } : item,
    );
  }
  const added = clampQuantity(quantity);
  return added > 0 ? [...lines, { ...line, key, quantity: added }] : [...lines];
}

/** 0 이하로 줄이면 그 줄을 지운다. */
export function setLineQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  const next = clampQuantity(quantity);
  if (next <= 0) return removeLine(lines, key);
  return lines.map(item => (item.key === key ? { ...item, quantity: next } : item));
}

export function removeLine(lines: readonly CartLine[], key: string): CartLine[] {
  return lines.filter(item => item.key !== key);
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** 주문 API로 보내는 모양. 가격·이름은 싣지 않는다 — 서버가 믿지 않는 값이다. */
export function toOrderItems(lines: readonly CartLine[]): Array<{ id: number; option_id: string | null; quantity: number }> {
  return lines.map(({ id, option_id, quantity }) => ({ id, option_id, quantity }));
}

/**
 * localStorage에 저장돼 있던 장바구니 → 지금 모양.
 *
 * 옵션 이전의 줄은 `{ id, name, price, image_url, quantity }`였다. 방문자의
 * 브라우저에 그대로 남아 있으므로, 버리지 않고 `key`와 빈 옵션을 붙여 살린다.
 * 모양이 망가진 줄은 버린다 — 틀린 줄 하나 때문에 장바구니 화면이 죽으면 안 된다.
 * 같은 열쇠가 두 번 나오면 수량을 합친다.
 */
export function migrateCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  let lines: CartLine[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    const { id, name, price, image_url, quantity } = item;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) continue;
    if (typeof name !== 'string' || typeof price !== 'number' || typeof quantity !== 'number') continue;
    const optionId = typeof item.option_id === 'string' && item.option_id ? item.option_id : null;
    lines = addLine(
      lines,
      {
        id,
        option_id: optionId,
        option_label: optionId && typeof item.option_label === 'string' ? item.option_label : null,
        name,
        price,
        image_url: typeof image_url === 'string' ? image_url : '',
      },
      quantity,
    );
  }
  return lines;
}
