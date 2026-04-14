import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ThemeShell from '@/components/ThemeShell';

export const metadata: Metadata = {
  title: {
    default: 'phorage — Collecting the Greenery',
    template: '%s | phorage',
  },
  description: '빛을 수집하고 세상을 분석합니다. 자연과 일상이 교차하는 지점을 기록하는 phorage studio.',
  openGraph: {
    title: 'phorage — Collecting the Greenery',
    description: '빛을 수집하고 세상을 분석합니다. 자연과 일상이 교차하는 지점을 기록하는 phorage studio.',
    siteName: 'phorage',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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
