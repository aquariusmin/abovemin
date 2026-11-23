import { cartLineKey, MAX_LINE_QUANTITY, placeAddonsUnderParents } from './cart-lines';
import {
  ADDON_LABEL,
  isAddonAvailable,
  isOptionAvailable,
  parseAddons,
  parseOptions,
  publicState,
  type ProductStateInput,
} from './product';

// 손님 값 중 믿는 것은 id·옵션 id·추가 상품 id·수량뿐. 이름·가격은 전부 DB 행에서 온다.
// 옛 주문에는 `option_*`/`addon_*` 키가 없을 수 있다. 추가 상품 줄의 `id`·`name`은 부모 상품 것.
export interface OrderItemRecord {
  id?: number;
  name: string;
  option_id?: string | null;
  option_label?: string | null;
  addon_id?: string | null;
  addon_label?: string | null;
  price: number;
  quantity: number;
}

export interface ResolvedOrderItem {
  id: number;
  name: string;
  option_id: string | null;
  option_label: string | null;
  addon_id?: string;
  addon_label?: string;
  price: number;
  quantity: number;
}

export function orderItemLabel(item: Pick<OrderItemRecord, 'name' | 'option_label' | 'addon_label'>): string {
  if (item.addon_label) return `${item.name} · ${ADDON_LABEL}: ${item.addon_label}`;
  return item.option_label ? `${item.name} · ${item.option_label}` : item.name;
}

export interface RequestedItem {
  id: number;
  option_id?: string | null;
  addon_id?: string | null;
  quantity: number;
}

export interface OrderableProduct extends ProductStateInput {
  id: number;
  name: string;
  /** 20261014010000_product_addons 이후 컬럼. 없으면 추가 상품 없음. */
  addons?: unknown;
}

export type ResolveResult =
  | { ok: true; items: ResolvedOrderItem[]; total: number }
  | { ok: false; error: string };

const GONE = '장바구니에 더 이상 판매하지 않는 상품이 있습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.';

// 추가 상품 줄은 같은 주문에 부모 상품 줄이 있어야 하고, 이름·가격은 `products.addons`에서 읽는다.
export function resolveOrderItems(requested: readonly RequestedItem[], products: readonly OrderableProduct[]): ResolveResult {
  const byId = new Map(products.map(product => [product.id, product]));

  // 같은 줄이 두 번 오면 합친다 — 안 합치면 줄당 99개 상한이 우회된다.
  const merged = new Map<string, RequestedItem>();
  for (const item of requested) {
    const key = cartLineKey(item.id, item.option_id, item.addon_id);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
  }

  // 추가 상품 줄이 기댈 수 있는 것은 이 주문 안의 부모 줄뿐이다.
  const parentIds = new Set<number>();
  for (const item of merged.values()) if (!item.addon_id) parentIds.add(item.id);

  const items: ResolvedOrderItem[] = [];
  for (const item of merged.values()) {
    if (item.quantity > MAX_LINE_QUANTITY) {
      return { ok: false, error: `한 상품은 ${MAX_LINE_QUANTITY}개까지 주문할 수 있습니다.` };
    }
    const product = byId.get(item.id);
    // 초안은 공개 화면에 없는 상품이다 — 지운 상품과 똑같이 다룬다.
    if (!product || publicState(product) === 'draft') return { ok: false, error: GONE };
    if (publicState(product) === 'sold_out') {
      return { ok: false, error: `'${product.name}'은(는) 품절되었습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.` };
    }

    if (item.addon_id) {
      if (!parentIds.has(product.id)) {
        return { ok: false, error: `'${product.name}'의 추가 상품은 그 상품과 함께 주문해야 합니다. 장바구니에서 삭제하거나 상품 페이지에서 함께 담아주세요.` };
      }
      const addon = parseAddons(product.addons).find(candidate => candidate.id === item.addon_id);
      if (!addon) {
        return { ok: false, error: `'${product.name}'의 선택한 추가 상품은 더 이상 판매하지 않습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.` };
      }
      const label = orderItemLabel({ name: product.name, addon_label: addon.label });
      if (!isAddonAvailable(addon)) {
        return { ok: false, error: `'${label}'은(는) 품절되었습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.` };
      }
      items.push({
        id: product.id,
        name: product.name,
        option_id: null,
        option_label: null,
        addon_id: addon.id,
        addon_label: addon.label,
        // 추가 상품의 가격 — 상품이나 옵션의 가격이 아니다.
        price: addon.price,
        quantity: item.quantity,
      });
      continue;
    }

    const options = parseOptions(product.options);
    if (options.length === 0) {
      if (item.option_id) {
        return { ok: false, error: `'${product.name}'의 옵션 구성이 바뀌었습니다. 장바구니에서 삭제한 뒤 다시 담아주세요.` };
      }
      items.push({ id: product.id, name: product.name, option_id: null, option_label: null, price: product.price, quantity: item.quantity });
      continue;
    }

    if (!item.option_id) {
      return { ok: false, error: `'${product.name}'은(는) 옵션을 골라야 합니다. 장바구니에서 삭제한 뒤 상품 페이지에서 다시 담아주세요.` };
    }
    const option = options.find(candidate => candidate.id === item.option_id);
    if (!option) {
      return { ok: false, error: `'${product.name}'의 선택한 옵션은 더 이상 판매하지 않습니다. 장바구니에서 삭제한 뒤 다시 담아주세요.` };
    }
    if (!isOptionAvailable(option)) {
      return { ok: false, error: `'${orderItemLabel({ name: product.name, option_label: option.label })}'은(는) 품절되었습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.` };
    }
    items.push({
      id: product.id,
      name: product.name,
      option_id: option.id,
      option_label: option.label,
      // 옵션의 가격 — 상품의 `price`(가장 싼 옵션 값)가 아니다.
      price: option.price,
      quantity: item.quantity,
    });
  }

  const ordered = placeAddonsUnderParents(items);
  const total = ordered.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ok: true, items: ordered, total };
}
