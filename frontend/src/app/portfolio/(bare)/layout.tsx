import BareFrame from '@/components/BareFrame';

// /portfolio/submission/**, /portfolio/print — 크롬 없이 뜬다. 그룹이
// `portfolio/` 안쪽에 있는 이유는 `../(site)/layout.tsx` 참고.
export default function PortfolioBareLayout({ children }: { children: React.ReactNode }) {
  return <BareFrame>{children}</BareFrame>;
}
