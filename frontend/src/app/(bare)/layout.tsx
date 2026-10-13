import BareFrame from '@/components/BareFrame';

// 사이트 크롬 없이 뜨는 화면: /admin, /en/portfolio의 제출본·인쇄.
// (한국어 제출본·인쇄는 `app/portfolio/(bare)`.)
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <BareFrame>{children}</BareFrame>;
}
