import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lab — Quant Fleet',
  description: '실시간 퀀트 트레이딩 봇 대시보드. 봇별 equity, PnL, 보유 종목, 90일 equity 추이.',
  other: { 'color-scheme': 'dark' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
