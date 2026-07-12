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

export default function Footer() {
  const pathname = usePathname();
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);
  if (isPortfolioFocused) return null;

  return (
    <footer className="px-3 sm:px-4 md:px-6 pb-4 md:pb-6 pt-8">
      <div className="glass max-w-7xl mx-auto rounded-[1.75rem] px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-5 space-y-5">
            <p className="eyebrow text-coral">Collecting the greenery</p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
              phorage
            </h2>
            <p className="text-sm leading-relaxed text-muted max-w-xs break-keep">
              빛을 수집하고 세상을 분석합니다. 어제와 오늘의 경계에서 발견한
              가장 정직하고 따뜻한 기록들.
            </p>
          </div>

          <div className="hidden md:block md:col-span-2" />

          {/* Index */}
          <nav className="md:col-span-2 space-y-5" aria-label="Footer">
            <h3 className="eyebrow text-muted">Index</h3>
            <ul className="space-y-3 text-sm">
              {NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-muted hover:text-ink transition-colors ${item.italic ? 'italic' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div className="md:col-span-3 space-y-5">
            <h3 className="eyebrow text-muted">Connect</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:aquariusmin01@naver.com" className="link-underline text-muted hover:text-ink">
                  aquariusmin01@naver.com
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/aquariusmin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-muted hover:text-ink"
                >
                  GitHub / aquariusmin
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/sangmin__02"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-muted hover:text-ink"
                >
                  Instagram / @sangmin__02
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-hairline/60 flex flex-col sm:flex-row justify-between gap-3 eyebrow text-muted">
          <span>&copy; 2026 phorage studio</span>
          <span>Digital studio · Seoul</span>
        </div>
      </div>
    </footer>
  );
}
