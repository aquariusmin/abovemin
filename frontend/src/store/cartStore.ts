import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addLine,
  addLines,
  cartCount,
  cartTotal,
  migrateCartLines,
  removeLine,
  setLineQuantity,
  type CartLine,
  type NewCartLine,
} from '@/lib/cart-lines';

export type CartItem = CartLine;

interface CartStore {
  items: CartItem[];
  addItem: (line: NewCartLine) => void;
  /** 상품 줄과 그 추가 상품들을 한 번에. 추가 상품은 부모 줄 없이는 담기지 않는다. */
  addItems: (entries: ReadonlyArray<{ line: NewCartLine; quantity?: number }>) => void;
  /**
   * `key`는 `cartLineKey(상품 id, 옵션 id, 추가 상품 id)` — 같은 상품의 다른 옵션은
   * 다른 줄이다. 상품의 마지막 줄을 지우면 그 상품의 추가 상품 줄도 같이 사라진다.
   */
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: line => set(state => ({ items: addLine(state.items, line) })),
      addItems: entries => set(state => ({ items: addLines(state.items, entries) })),
      removeItem: key => set(state => ({ items: removeLine(state.items, key) })),
      updateQuantity: (key, quantity) => set(state => ({ items: setLineQuantity(state.items, key, quantity) })),
      clearCart: () => set({ items: [] }),
      totalCount: () => cartCount(get().items),
      totalPrice: () => cartTotal(get().items),
    }),
    {
      name: 'phorage-cart',
      // v0: 옵션 이전의 줄(`key`·`option_id` 없음). v1: 추가 상품 이전의 줄
      // (`addon_id`·`addon_label` 없음). 방문자 브라우저에 남아 있는 장바구니를
      // 버리지 않고 지금 모양으로 옮긴다 — `migrateCartLines`는 줄의 모양만 보고
      // 채우므로 어느 버전에서 와도 같은 함수다.
      version: 2,
      migrate: persisted => ({
        items: migrateCartLines((persisted as { items?: unknown } | null)?.items),
      }),
    },
  ),
);
