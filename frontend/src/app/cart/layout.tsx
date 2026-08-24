import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cart',
  description: '장바구니 — phorage shop',
  // A cart is per-visitor state, not a document. Indexed it would compete with
  // /shop for the same queries and land arrivals on an empty basket.
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
