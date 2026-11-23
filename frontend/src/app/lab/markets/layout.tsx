import type { Metadata } from 'next';

// Owner-only. Does NOT gate access — each page calls requireOwner() (layouts can be reused).
export const metadata: Metadata = {
  title: 'Markets — 본인 전용',
  description: '본인 전용 시장 대시보드.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
