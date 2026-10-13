import SiteChrome from '@/components/SiteChrome';

// `/portfolio`가 `app/(site)/portfolio`가 아니라 여기 있는 이유:
// `portfolio/opengraph-image.tsx`가 그룹 폴더 안에 들어가면 Next가 주소에 해시를
// 붙인다(`/portfolio/opengraph-image-xxxxxx`). 그리고 파일 규약 OG 이미지는
// 폴더 경로를 따라 상속되므로, 크롬이 있는 `/portfolio`·`/portfolio/[slug]`와
// 크롬이 없는 제출본·인쇄 화면이 같은 카드를 쓰려면 둘 다 그룹이 아닌
// `portfolio/` 폴더 아래에 있어야 한다. 그래서 그룹을 이 안쪽에 둔다.
//
// 치르는 값: 이 레이아웃은 `app/(site)/layout.tsx`와 다른 인스턴스라, 사이트의
// 다른 페이지와 `/portfolio` 사이를 오갈 때 Nav가 다시 마운트된다(전체 새로고침은
// 아니다). 그 경로는 `/about` ↔ `/portfolio` 본문 링크뿐이다.
export default function PortfolioSiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
