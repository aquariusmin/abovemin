import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'phorage에서 엄선한 소품들. 자연에서 영감 받은 포스터, 문구, 라이프스타일 아이템.',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
