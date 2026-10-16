import type { Metadata } from 'next';

/**
 * Owner-only. The parent /lab layout sets a canonical and a share card for the
 * public console; neither belongs here, and both are overwritten rather than
 * merged (Next replaces nested metadata objects per segment).
 *
 * This layout does NOT gate access — each page calls `requireOwner()`, because
 * a client navigation between sibling pages can reuse this layout without
 * running it again. Not in sitemap.ts, not in the Nav.
 */
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
