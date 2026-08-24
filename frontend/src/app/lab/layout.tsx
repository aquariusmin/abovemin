import type { Metadata } from 'next';
// Imported ONCE, here, rather than in each page under /lab. Both `page.tsx`
// and `bot/[id]/page.tsx` used to import it themselves, which is a second
// place to forget when a third console page is added — and the layout is
// already the thing every one of them renders inside.
import './lab-console.css';

export const metadata: Metadata = {
  title: 'Lab — Quant Fleet Console',
  description:
    '자동매매 플릿의 운영 상태 콘솔. 계좌별로 실자금/모의를 구분해 표시하며, 투자 권유나 성과 보장이 아닙니다.',
  other: { 'color-scheme': 'light' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
