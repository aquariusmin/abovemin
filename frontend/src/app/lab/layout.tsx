import type { Metadata } from 'next';
// Imported ONCE, here, rather than in each page under /lab. Both `page.tsx`
// and `bot/[id]/page.tsx` used to import it themselves, which is a second
// place to forget when a third console page is added — and the layout is
// already the thing every one of them renders inside.
import './lab-console.css';
import { sectionTitle, shareCard } from '@/lib/share-card';

const TITLE = 'Lab — Quant Fleet Console';
const DESCRIPTION =
  '자동매매 플릿의 운영 상태 콘솔. 계좌별로 실자금/모의를 구분해 표시하며, 투자 권유나 성과 보장이 아닙니다.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // metadataBase만으로는 canonical이 나오지 않는다. sitemap에 올라가 있는
  // 라우트인데 이것만 빠져 있었다.
  alternates: { canonical: '/lab' },
  // 적지 않으면 공유 카드가 사이트 기본 제목과 설명을 달고 나간다(`shareCard`).
  ...shareCard({ title: sectionTitle(TITLE), description: DESCRIPTION, path: '/lab' }),
  other: { 'color-scheme': 'light' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
