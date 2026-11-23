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
  addItems: (entries: ReadonlyArray<{ line: NewCartLine; quantity?: number }>) => void;
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
      // v0(옵션 이전)·v1(추가 상품 이전) 장바구니를 버리지 않고 지금 모양으로 옮긴다.
      version: 2,
      migrate: persisted => ({
        items: migrateCartLines((persisted as { items?: unknown } | null)?.items),
      }),
    },
  ),
);
