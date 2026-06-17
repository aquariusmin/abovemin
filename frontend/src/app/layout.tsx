import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ThemeShell from '@/components/ThemeShell';

// UI / body — clean modern sans (fulfils the --font-geist-* tokens in globals.css)
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

// Quant "Lab" dashboards — matching monospace
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

// Editorial headings — warm variable serif with optical sizing + italics
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['opsz'],
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
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <ThemeShell>
        <Nav />
        <div className="flex-grow pt-[72px] md:pt-[88px]">
          {children}
        </div>
        <Footer />
      </ThemeShell>
    </html>
  );
}
