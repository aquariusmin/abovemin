import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lab — Market Overview',
  description: '글로벌 시장 지수, 섹터 퍼포먼스, 한국 주요 종목 현황을 한눈에.',
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
