import type { Metadata } from 'next';

// 레이아웃에 title 문자열을 두면 루트의 `%s | phorage` 템플릿이 /shop/[id]까지 내려오지 못한다.
export const metadata: Metadata = {
  description: 'phorage의 사진으로 만든 엽서, 달력, 포스터.',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
