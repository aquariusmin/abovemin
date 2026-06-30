import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lab — Paper-Trading Validation',
  description: '실서버 페이퍼 트레이딩 검증 대시보드. 실자금 운용이나 투자 성과를 나타내지 않습니다.',
  other: { 'color-scheme': 'dark' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
