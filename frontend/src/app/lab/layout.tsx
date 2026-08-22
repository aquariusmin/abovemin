import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lab — Quant Fleet Console',
  description:
    '자동매매 플릿의 운영 상태 콘솔. 계좌별로 실자금/모의를 구분해 표시하며, 투자 권유나 성과 보장이 아닙니다.',
  other: { 'color-scheme': 'dark' },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
