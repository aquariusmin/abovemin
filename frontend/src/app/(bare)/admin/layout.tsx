import type { Metadata } from 'next';

// `admin/page.tsx`는 클라이언트 컴포넌트라 `metadata`를 내보낼 수 없다. 그래서
// 이 레이아웃이 그 자리를 대신한다.
//
// robots.txt가 이미 `/admin`을 Disallow하고 있지만, Disallow는 "크롤하지 마라"
// 이지 "색인하지 마라"가 아니다. 어딘가에서 링크가 하나 걸리면 검색엔진은
// 본문 없이 URL만으로도 결과에 올릴 수 있다. 그 경우를 막는 것은 이 메타
// 태그뿐이다 — 단, 이 태그는 크롤러가 페이지를 읽을 수 있어야 효력이 있으므로
// robots.txt의 Disallow와 함께 두 겹으로 두는 것이 맞다.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
