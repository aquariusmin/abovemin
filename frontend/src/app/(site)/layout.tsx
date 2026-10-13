import SiteChrome from '@/components/SiteChrome';

// Nav + 본문 여백 + Footer. 이 그룹 안에서 이동하는 동안 Nav는 다시 마운트되지
// 않는다. `/portfolio`는 OG 이미지 때문에 그룹 밖에 있고 같은 크롬을 따로
// 그린다 — `app/portfolio/(site)/layout.tsx` 참고.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
