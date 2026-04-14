import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cart',
  description: '장바구니 — phorage shop',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
