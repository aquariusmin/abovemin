// 줄의 가격·이름은 표시용이다. 주문 API는 id·옵션·추가 상품·수량만 받고 가격은 DB에서 다시 읽는다.
export interface CartLine {
  key: string;
  id: number;
  option_id: string | null;
  option_label: string | null;
  addon_id: string | null;
  addon_label: string | null;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

export type NewCartLine = Omit<CartLine, 'key' | 'quantity' | 'addon_id' | 'addon_label'> & {
  addon_id?: string | null;
  addon_label?: string | null;
};

// 주문 스키마(`orders-schema.ts`)의 수량 상한과 같아야 한다.
export const MAX_LINE_QUANTITY = 99;

export function cartLineKey(id: number, optionId?: string | null, addonId?: string | null): string {
  // id에는 `:`·`+`가 들어갈 수 없어(`OPTION_ID_RE`) 열쇠가 모호하지 않다.
  if (addonId) return `${id}+${addonId}`;
  return optionId ? `${id}:${optionId}` : String(id);
}

export function isAddonLine(line: { addon_id?: string | null }): boolean {
  return Boolean(line.addon_id);
}

export function hasParentLine(lines: ReadonlyArray<{ id: number; addon_id?: string | null }>, productId: number): boolean {
  return lines.some(line => line.id === productId && !isAddonLine(line));
}

// 부모 없는 추가 상품 줄은 버린다(추가 상품은 혼자 주문할 수 없다).
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
    option_id: addonId ? null : input.option_id || null,
    option_label: addonId ? null : input.option_label ?? null,
    addon_id: addonId,
    addon_label: addonId ? input.addon_label ?? null : null,
  };
  const key = cartLineKey(line.id, line.option_id, line.addon_id);
  const existing = lines.find(item => item.key === key);
  if (existing) {
    return lines.map(item =>
      item.key === key ? { ...item, ...line, key, quantity: clampQuantity(item.quantity + quantity) } : item,
    );
  }
  const added = clampQuantity(quantity);
  return added > 0 ? [...lines, { ...line, key, quantity: added }] : [...lines];
}

export function addLine(lines: readonly CartLine[], line: NewCartLine, quantity = 1): CartLine[] {
  return placeAddonsUnderParents(insertLine(lines, line, quantity));
}

export function addLines(
  lines: readonly CartLine[],
  entries: ReadonlyArray<{ line: NewCartLine; quantity?: number }>,
): CartLine[] {
  let next: CartLine[] = [...lines];
  for (const entry of entries) next = insertLine(next, entry.line, entry.quantity ?? 1);
  return placeAddonsUnderParents(next);
}

export function setLineQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  const next = clampQuantity(quantity);
  if (next <= 0) return removeLine(lines, key);
  return lines.map(item => (item.key === key ? { ...item, quantity: next } : item));
}

export function removeLine(lines: readonly CartLine[], key: string): CartLine[] {
  return placeAddonsUnderParents(lines.filter(item => item.key !== key));
}

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

// 가격·이름은 싣지 않는다 — 서버가 믿지 않는 값이다.
export function toOrderItems(lines: readonly CartLine[]): OrderRequestItem[] {
  return lines.map(({ id, option_id, addon_id, quantity }) =>
    addon_id ? { id, addon_id, quantity } : { id, option_id, quantity },
  );
}

// localStorage의 옛 모양을 살린다. 망가진 줄은 버리고(화면이 죽지 않게), 같은 열쇠는 수량을 합친다.
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
