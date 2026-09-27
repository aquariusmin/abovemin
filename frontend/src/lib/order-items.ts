import { cartLineKey, MAX_LINE_QUANTITY } from './cart-lines';
import { isOptionAvailable, parseOptions, publicState, type ProductStateInput } from './product';

/**
 * 주문 줄 — 주문 API가 **DB 값으로** 만들고, 메일·관리 화면·CSV가 읽는다.
 *
 * 이 파일의 핵심은 `resolveOrderItems`다: 손님이 보낸 것 중 믿는 것은 상품 id,
 * 옵션 id, 수량뿐이다. 이름·옵션 이름·가격은 전부 방금 DB에서 읽은 행에서
 * 온다. 옵션이 생기면서 "가격이 어디서 오는가"가 상품 한 곳에서 옵션 배열
 * 안쪽으로 옮겨 갔고, 그 사이에 클라이언트 값을 끼워 넣을 틈이 생기기 쉽다 —
 * 그래서 라우트 밖에 순수 함수로 두고 테스트로 잠근다.
 *
 * 클라이언트 번들(관리 화면)에서도 `orderItemLabel`을 쓰므로 서버 모듈을
 * import하지 않는다.
 */

/**
 * `orders.items`의 한 줄. 옵션 이전에 들어온 주문에는 `option_*` 키가 없다 —
 * 읽는 쪽은 둘 다 optional로 다룬다.
 */
export interface OrderItemRecord {
  id?: number;
  name: string;
  option_id?: string | null;
  option_label?: string | null;
  price: number;
  quantity: number;
}

export interface ResolvedOrderItem {
  id: number;
  name: string;
  option_id: string | null;
  option_label: string | null;
  price: number;
  quantity: number;
}

/** "포스터 · A3 · 매트지". 옵션이 없으면(옛 주문 포함) 이름만. */
export function orderItemLabel(item: Pick<OrderItemRecord, 'name' | 'option_label'>): string {
  return item.option_label ? `${item.name} · ${item.option_label}` : item.name;
}

export interface RequestedItem {
  id: number;
  option_id?: string | null;
  quantity: number;
}

export interface OrderableProduct extends ProductStateInput {
  id: number;
  name: string;
}

export type ResolveResult =
  | { ok: true; items: ResolvedOrderItem[]; total: number }
  | { ok: false; error: string };

const GONE = '장바구니에 더 이상 판매하지 않는 상품이 있습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.';

export function resolveOrderItems(requested: readonly RequestedItem[], products: readonly OrderableProduct[]): ResolveResult {
  const byId = new Map(products.map(product => [product.id, product]));

  // 같은 줄(상품 + 옵션)이 두 번 오면 합친다. 장바구니는 열쇠마다 한 줄이지만
  // 본문은 누구나 만들 수 있다 — 합쳐야 주문 기록이 장바구니와 같은 모양이고,
  // 줄마다 99개 상한도 우회되지 않는다.
  const merged = new Map<string, RequestedItem>();
  for (const item of requested) {
    const key = cartLineKey(item.id, item.option_id);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
  }

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

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ok: true, items, total };
}
