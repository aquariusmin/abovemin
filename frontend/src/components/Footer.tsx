"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/archive', label: 'Archive' },
  { href: '/shop', label: 'Shop' },
  { href: '/lab', label: 'The Lab', italic: true },
];

const CONNECT = [
  { href: 'mailto:aquariusmin01@naver.com', label: 'aquariusmin01@naver.com', external: false },
  { href: 'https://github.com/aquariusmin', label: 'GitHub / aquariusmin', external: true },
  { href: 'https://instagram.com/sangmin__02', label: 'Instagram / @sangmin__02', external: true },
];

export default function Footer() {
  const pathname = usePathname();
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);
  if (isPortfolioFocused) return null;

  return (
    // The page's deepest surface. Ending on forest-black lets the warm canvas
    // above read as daylight and gives the wordmark one full-bleed moment.
    <footer className="band-navy texture-grain">
      {/* Canopy gradient hairline capping the band */}
      <div aria-hidden className="h-[3px] bg-gradient-to-r from-forest via-fern to-moss" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-16 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-12 gap-x-8">

          {/* Brand — signature wordmark + studio line */}
          <div className="col-span-2 md:col-span-6 space-y-5">
            <p className="eyebrow text-moss">Collecting the greenery</p>
            <h2 className="font-serif text-[2.75rem] md:text-6xl font-medium tracking-tight leading-none text-cream">
              phorage
            </h2>
            <p className="text-sm leading-relaxed text-cream/60 max-w-sm break-keep">
              빛을 수집하고 세상을 분석합니다. 서울에서 사진 아카이브와 소품샵,
              그리고 데이터 분석 작업을 함께 운영합니다.
            </p>
          </div>

          <div className="hidden md:block md:col-span-1" />

          {/* Index */}
          <nav className="md:col-span-2 space-y-4" aria-label="Footer">
            <h3 className="eyebrow text-cream/40">Index</h3>
            <ul className="space-y-3 text-sm">
              {NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-cream/70 hover:text-moss transition-colors ${item.italic ? 'italic' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="eyebrow text-cream/40">Connect</h3>
            <ul className="space-y-3 text-sm">
              {CONNECT.map(item => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="link-underline text-cream/70 hover:text-moss"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Meta row — thin rule, mono microcopy */}
        <div className="mt-16 md:mt-20 pt-6 border-t border-cream/15 flex flex-col sm:flex-row justify-between gap-3 eyebrow text-cream/40">
          <span>&copy; 2026 phorage studio</span>
          <span>Digital studio · Seoul</span>
        </div>
      </div>
    </footer>
  );
}
