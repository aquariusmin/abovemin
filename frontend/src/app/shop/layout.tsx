import type { Metadata } from 'next';

// `shop/page.tsx` sets its own title and description, so this layout only has
// to cover what a page cannot: /shop/[id] inherits the canonical from its own
// generateMetadata, and everything else here would just be a second copy of
// values the page already owns.
//
// 제목은 여기서 정하지 않는다. 레이아웃이 `title`을 문자열로 두면 그 아래
// 세그먼트에 넘어갈 템플릿이 `null`로 초기화된다 — 루트의 `%s | phorage`가
// /shop/[id]까지 내려오지 못해서 상품 상세만 탭에 "달력"으로 떴다(다른
// 페이지는 "Archive | phorage"). /shop의 제목은 page.tsx가 이미 갖고 있다.
export const metadata: Metadata = {
  description: 'phorage의 사진으로 만든 엽서, 달력, 포스터.',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
