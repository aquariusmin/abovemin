import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addLine,
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
  /** `key`는 `cartLineKey(상품 id, 옵션 id)` — 같은 상품의 다른 옵션은 다른 줄이다. */
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
      removeItem: key => set(state => ({ items: removeLine(state.items, key) })),
      updateQuantity: (key, quantity) => set(state => ({ items: setLineQuantity(state.items, key, quantity) })),
      clearCart: () => set({ items: [] }),
      totalCount: () => cartCount(get().items),
      totalPrice: () => cartTotal(get().items),
    }),
    {
      name: 'phorage-cart',
      // v0: 옵션 이전의 줄(`key`·`option_id` 없음). 방문자 브라우저에 남아 있는
      // 장바구니를 버리지 않고 지금 모양으로 옮긴다.
      version: 1,
      migrate: persisted => ({
        items: migrateCartLines((persisted as { items?: unknown } | null)?.items),
      }),
    },
  ),
);
