import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ThemeShell from '@/components/ThemeShell';

// Display voice — grotesk with tight, carved cadence (DESIGN.md display stack).
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Body / UI voice.
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

// Technical / mono labels.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'phorage — Collecting the Greenery',
    template: '%s | phorage',
  },
  description: '빛을 수집하고 세상을 분석합니다. 자연과 일상이 교차하는 지점을 기록하는 phorage studio.',
  metadataBase: new URL('https://abovemin.com'),
  openGraph: {
    title: 'phorage — Collecting the Greenery',
    description: '빛을 수집하고 세상을 분석합니다. 자연과 일상이 교차하는 지점을 기록하는 phorage studio.',
    siteName: 'phorage',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'phorage studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'phorage — Collecting the Greenery',
    description: '빛을 수집하고 세상을 분석합니다.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <ThemeShell>
        <a href="#main-content" className="skip-link">본문 바로가기</a>
        <Nav />
        <div id="main-content" className="flex-grow pt-[72px] md:pt-[88px]">
          {children}
        </div>
        <Footer />
      </ThemeShell>
    </html>
  );
}
