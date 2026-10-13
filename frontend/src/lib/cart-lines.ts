/**
 * 장바구니 줄. 스토어(`store/cartStore.ts`)는 이 순수 함수들을 부르기만 한다.
 *
 * 줄의 열쇠는 **상품 id + 옵션 id**다. 같은 포스터의 A3와 A2는 다른 물건이라
 * 한 줄에 합치면 수량도 가격도 틀린다. 옵션이 없는 상품은 예전처럼 상품 id
 * 하나가 열쇠다 — 그래서 옵션이 생기기 전에 저장된 장바구니도 같은 열쇠로
 * 읽힌다(`migrateCartLines`).
 *
 * **추가 상품**(달력의 거치대)도 제 수량을 가진 한 줄이다. 열쇠는 상품 id +
 * 추가 상품 id이고, 옵션과는 무관하다 — 추가 상품은 옵션이 아니라 상품에 붙는다.
 * 추가 상품 줄은 그 상품의 줄(부모) 바로 아래에 놓이고, 부모가 하나도 남지 않으면
 * 같이 사라진다. 혼자서는 주문할 수 없기 때문이다(`lib/order-items.ts`).
 *
 * 줄에 든 가격·이름은 **화면 표시용**이다. 주문 API는 이 값을 받지 않고 DB에서
 * 다시 읽는다(`toOrderItems`가 id·옵션 id·추가 상품 id·수량만 넘긴다).
 */

export interface CartLine {
  key: string;
  id: number;
  option_id: string | null;
  option_label: string | null;
  /** 추가 상품 줄이면 그 id. 보통 줄은 `null`. 추가 상품 줄의 `option_id`는 늘 `null`이다. */
  addon_id: string | null;
  addon_label: string | null;
  /** 상품 이름. 추가 상품 줄에서도 **부모 상품**의 이름이다. */
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

/** 담을 줄. 추가 상품이 아니면 `addon_*`는 생략한다. */
export type NewCartLine = Omit<CartLine, 'key' | 'quantity' | 'addon_id' | 'addon_label'> & {
  addon_id?: string | null;
  addon_label?: string | null;
};

/** 주문 스키마(`orders-schema.ts`)의 수량 상한과 같다. 넘기면 주문이 400이 된다. */
export const MAX_LINE_QUANTITY = 99;

export function cartLineKey(id: number, optionId?: string | null, addonId?: string | null): string {
  // 옵션·추가 상품 id에는 `:`도 `+`도 들어갈 수 없다(`OPTION_ID_RE`) — 열쇠가
  // 모호해지지 않는다. 구분자가 달라서 id가 같은 옵션과 추가 상품도 다른 줄이다.
  if (addonId) return `${id}+${addonId}`;
  return optionId ? `${id}:${optionId}` : String(id);
}

/** 추가 상품 줄인가. 옛 장바구니·옛 주문 기록에는 키 자체가 없다. */
export function isAddonLine(line: { addon_id?: string | null }): boolean {
  return Boolean(line.addon_id);
}

/**
 * 추가 상품 줄을 부모 줄 아래로 모으고, 부모가 없는 추가 상품 줄은 버린다.
 *
 * 부모 줄의 순서는 건드리지 않는다 — 추가 상품이 없는 장바구니는 들어온 그대로
 * 나간다. 같은 상품이 옵션별로 여러 줄이면 추가 상품은 그 **마지막** 줄 아래에
 * 붙는다(추가 상품은 특정 옵션의 것이 아니다).
 *
 * 장바구니와 주문 API(`resolveOrderItems`)가 같이 쓴다 — 화면에 보인 순서가
 * 주문 기록·메일의 순서다.
 */
export function placeAddonsUnderParents<T extends { id: number; addon_id?: string | null }>(lines: readonly T[]): T[] {
  if (!lines.some(isAddonLine)) return [...lines];
  const parents = lines.filter(line => !isAddonLine(line));
  const lastParentIndex = new Map<number, number>();
  parents.forEach((line, index) => lastParentIndex.set(line.id, index));
  const ordered: T[] = [];
  parents.forEach((line, index) => {
    ordered.push(line);
    if (lastParentIndex.get(line.id) !== index) return;
    for (const addon of lines) if (isAddonLine(addon) && addon.id === line.id) ordered.push(addon);
  });
  return ordered;
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(quantity)));
}

function insertLine(lines: readonly CartLine[], input: NewCartLine, quantity: number): CartLine[] {
  const addonId = input.addon_id || null;
  const line = {
    ...input,
    // 추가 상품은 옵션에 묶이지 않는다 — 옵션을 실어 보내도 줄에는 남기지 않는다.
    option_id: addonId ? null : input.option_id || null,
    option_label: addonId ? null : input.option_label ?? null,
    addon_id: addonId,
    addon_label: addonId ? input.addon_label ?? null : null,
  };
  const key = cartLineKey(line.id, line.option_id, line.addon_id);
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

/** 부모 없는 추가 상품 줄은 담기지 않는다 — 부모 줄과 함께 담는다(`addLines`). */
export function addLine(lines: readonly CartLine[], line: NewCartLine, quantity = 1): CartLine[] {
  return placeAddonsUnderParents(insertLine(lines, line, quantity));
}

/** 상품 줄과 그 추가 상품들을 한 번에 담는다. 수량이 0인 항목은 건너뛴다. */
export function addLines(
  lines: readonly CartLine[],
  entries: ReadonlyArray<{ line: NewCartLine; quantity?: number }>,
): CartLine[] {
  let next: CartLine[] = [...lines];
  for (const entry of entries) next = insertLine(next, entry.line, entry.quantity ?? 1);
  return placeAddonsUnderParents(next);
}

/** 0 이하로 줄이면 그 줄을 지운다. */
export function setLineQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  const next = clampQuantity(quantity);
  if (next <= 0) return removeLine(lines, key);
  return lines.map(item => (item.key === key ? { ...item, quantity: next } : item));
}

/**
 * 줄 하나를 지운다. 그 상품의 마지막 부모 줄이었다면 그 상품의 추가 상품 줄도
 * 같이 지운다 — 거치대만 남은 장바구니는 주문할 수 없다.
 */
export function removeLine(lines: readonly CartLine[], key: string): CartLine[] {
  return placeAddonsUnderParents(lines.filter(item => item.key !== key));
}

/** `removeLine(key)`가 함께 지울 추가 상품 줄들. 화면이 "같이 뺐다"고 알릴 때 쓴다. */
export function cascadedAddons(lines: readonly CartLine[], key: string): CartLine[] {
  const target = lines.find(item => item.key === key);
  if (!target || isAddonLine(target)) return [];
  const kept = new Set(removeLine(lines, key).map(item => item.key));
  return lines.filter(item => item.key !== key && !kept.has(item.key));
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export type OrderRequestItem =
  | { id: number; option_id: string | null; quantity: number }
  | { id: number; addon_id: string; quantity: number };

/**
 * 주문 API로 보내는 모양. 가격·이름은 싣지 않는다 — 서버가 믿지 않는 값이다.
 * 보통 줄은 예전 그대로 `{ id, option_id, quantity }`, 추가 상품 줄은
 * `{ id, addon_id, quantity }`(id는 부모 상품)다.
 */
export function toOrderItems(lines: readonly CartLine[]): OrderRequestItem[] {
  return lines.map(({ id, option_id, addon_id, quantity }) =>
    addon_id ? { id, addon_id, quantity } : { id, option_id, quantity },
  );
}

/**
 * localStorage에 저장돼 있던 장바구니 → 지금 모양.
 *
 * 옵션 이전의 줄은 `{ id, name, price, image_url, quantity }`였다. 방문자의
 * 브라우저에 그대로 남아 있으므로, 버리지 않고 `key`와 빈 옵션을 붙여 살린다.
 * 모양이 망가진 줄은 버린다 — 틀린 줄 하나 때문에 장바구니 화면이 죽으면 안 된다.
 * 같은 열쇠가 두 번 나오면 수량을 합친다.
 *
 * 추가 상품 이전의 줄(v1)에는 `addon_*` 키가 없다 — `null`로 채운다. 부모 줄이
 * 없는 추가 상품 줄은 버린다.
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
    const addonId = typeof item.addon_id === 'string' && item.addon_id ? item.addon_id : null;
    lines = insertLine(
      lines,
      {
        id,
        option_id: optionId,
        option_label: optionId && typeof item.option_label === 'string' ? item.option_label : null,
        addon_id: addonId,
        addon_label: addonId && typeof item.addon_label === 'string' ? item.addon_label : null,
        name,
        price,
        image_url: typeof image_url === 'string' ? image_url : '',
      },
      quantity,
    );
  }
  return placeAddonsUnderParents(lines);
}
