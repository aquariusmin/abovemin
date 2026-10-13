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

/**
 * 주문 줄 — 주문 API가 **DB 값으로** 만들고, 메일·관리 화면·CSV가 읽는다.
 *
 * 이 파일의 핵심은 `resolveOrderItems`다: 손님이 보낸 것 중 믿는 것은 상품 id,
 * 옵션 id, 추가 상품 id, 수량뿐이다. 이름·옵션 이름·가격은 전부 방금 DB에서 읽은 행에서
 * 온다. 옵션이 생기면서 "가격이 어디서 오는가"가 상품 한 곳에서 옵션 배열
 * 안쪽으로 옮겨 갔고, 그 사이에 클라이언트 값을 끼워 넣을 틈이 생기기 쉽다 —
 * 그래서 라우트 밖에 순수 함수로 두고 테스트로 잠근다.
 *
 * 클라이언트 번들(관리 화면)에서도 `orderItemLabel`을 쓰므로 서버 모듈을
 * import하지 않는다.
 */

/**
 * `orders.items`의 한 줄. 옵션 이전에 들어온 주문에는 `option_*` 키가 없고,
 * 추가 상품 이전의 주문과 **추가 상품이 아닌 모든 줄**에는 `addon_*` 키가 없다 —
 * 읽는 쪽은 전부 optional로 다룬다.
 *
 * 추가 상품 줄은 `addon_id`·`addon_label`이 있고, `id`·`name`은 **부모 상품**의
 * 것이다("2027 Calendar · 추가: 거치대"). `price`는 추가 상품의 가격이다.
 */
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
  /** 추가 상품 줄에만 있다. 보통 줄에는 키째 없다 — 옛 주문과 같은 모양으로 남는다. */
  addon_id?: string;
  addon_label?: string;
  price: number;
  quantity: number;
}

/**
 * "포스터 · A3 · 매트지", 추가 상품 줄은 "2027 Calendar · 추가: 거치대".
 * 옵션도 추가 상품도 없으면(옛 주문 포함) 이름만. 메일·CSV·관리 화면이 같이 쓴다.
 */
export function orderItemLabel(item: Pick<OrderItemRecord, 'name' | 'option_label' | 'addon_label'>): string {
  if (item.addon_label) return `${item.name} · ${ADDON_LABEL}: ${item.addon_label}`;
  return item.option_label ? `${item.name} · ${item.option_label}` : item.name;
}

export interface RequestedItem {
  id: number;
  option_id?: string | null;
  /** 있으면 추가 상품 줄이다 — `id`는 부모 상품. */
  addon_id?: string | null;
  quantity: number;
}

export interface OrderableProduct extends ProductStateInput {
  id: number;
  name: string;
  /** 마이그레이션(20261014010000_product_addons) 이후 컬럼. 없으면 추가 상품 없음. */
  addons?: unknown;
}

export type ResolveResult =
  | { ok: true; items: ResolvedOrderItem[]; total: number }
  | { ok: false; error: string };

const GONE = '장바구니에 더 이상 판매하지 않는 상품이 있습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.';

/**
 * 추가 상품 줄의 규칙 — 전부 서버가 DB 값으로 본다:
 *
 *  1. 같은 주문에 **부모 상품의 줄이 하나는** 있어야 한다. 거치대만 주문할 수 없다.
 *  2. 부모 상품이 살 수 있는 상태여야 한다(초안·삭제·품절이면 거절). 부모 줄도
 *     같은 검사를 지나므로, 여기까지 온 추가 상품의 부모는 주문에 실제로 들어간다.
 *  3. 추가 상품이 `products.addons`에 있어야 하고(컬럼이 없는 마이그레이션 전의
 *     행은 "없음"이다), 재고가 있고 가격이 0원보다 커야 한다.
 *  4. 이름과 가격은 그 배열에서 읽는다. 옵션과는 무관하다 — 어느 옵션의 줄이든
 *     부모로 친다.
 */
export function resolveOrderItems(requested: readonly RequestedItem[], products: readonly OrderableProduct[]): ResolveResult {
  const byId = new Map(products.map(product => [product.id, product]));

  // 같은 줄(상품 + 옵션, 또는 상품 + 추가 상품)이 두 번 오면 합친다. 장바구니는 열쇠마다 한 줄이지만
  // 본문은 누구나 만들 수 있다 — 합쳐야 주문 기록이 장바구니와 같은 모양이고,
  // 줄마다 99개 상한도 우회되지 않는다.
  const merged = new Map<string, RequestedItem>();
  for (const item of requested) {
    const key = cartLineKey(item.id, item.option_id, item.addon_id);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
  }

  // 부모 줄을 가진 상품들. 추가 상품 줄이 기댈 수 있는 것은 **이 주문 안의** 줄뿐이다.
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
      // 옵션이 없어진 상품에 옵션을 붙여 보냈다: 담은 뒤에 옵션 구성이 바뀌었다.
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

  // 추가 상품 줄은 부모 줄 바로 아래에 적는다 — 장바구니에 보인 순서와 같다.
  const ordered = placeAddonsUnderParents(items);
  const total = ordered.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ok: true, items: ordered, total };
}
