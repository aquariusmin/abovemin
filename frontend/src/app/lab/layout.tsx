import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lab — Market Overview',
  description: '글로벌 주식, 암호화폐, 원자재, 채권, 섹터 퍼포먼스를 한눈에. 퀀트 트레이딩 분석 대시보드.',
  other: { 'color-scheme': 'dark' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
