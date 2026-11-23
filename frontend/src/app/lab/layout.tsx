import type { Metadata } from 'next';
import './lab-console.css';
import { sectionTitle, shareCard } from '@/lib/share-card';

const TITLE = 'Lab — Quant Fleet Console';
const DESCRIPTION =
  '자동매매 플릿의 운영 상태 콘솔. 계좌별로 실자금/모의를 구분해 표시하며, 투자 권유나 성과 보장이 아닙니다.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // metadataBase만으로는 canonical이 나오지 않는다.
  alternates: { canonical: '/lab' },
  ...shareCard({ title: sectionTitle(TITLE), description: DESCRIPTION, path: '/lab' }),
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
