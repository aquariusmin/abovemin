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
    <footer className="border-t border-hairline bg-surface">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-12 gap-x-8">

          {/* Brand — signature wordmark + studio line */}
          <div className="col-span-2 md:col-span-6 space-y-5">
            <p className="eyebrow text-coral">Collecting the greenery</p>
            <h2 className="font-serif text-[2.75rem] md:text-6xl font-medium tracking-tight leading-none text-ink">
              phorage
            </h2>
            <p className="text-sm leading-relaxed text-slate max-w-sm break-keep">
              빛을 수집하고 세상을 분석합니다. 어제와 오늘의 경계에서 발견한
              가장 정직하고 따뜻한 기록들.
            </p>
          </div>

          <div className="hidden md:block md:col-span-1" />

          {/* Index */}
          <nav className="md:col-span-2 space-y-4" aria-label="Footer">
            <h3 className="eyebrow text-muted">Index</h3>
            <ul className="space-y-3 text-sm">
              {NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-slate hover:text-ink transition-colors ${item.italic ? 'italic' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="eyebrow text-muted">Connect</h3>
            <ul className="space-y-3 text-sm">
              {CONNECT.map(item => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="link-underline text-slate hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Meta row — thin rule, mono microcopy */}
        <div className="mt-16 md:mt-20 pt-6 border-t border-hairline flex flex-col sm:flex-row justify-between gap-3 eyebrow text-muted">
          <span>&copy; 2026 phorage studio</span>
          <span>Digital studio · Seoul</span>
        </div>
      </div>
    </footer>
  );
}
