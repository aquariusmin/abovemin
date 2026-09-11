"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';
import { notes } from '@/data/notes';

const hasNotes = notes.length > 0;

// About and Portfolio are deliberately absent here, as they are in `Nav`.
// Neither page is gone: both stay live, indexed and in the sitemap. What
// changes is that they are no longer in the chrome that follows a visitor
// around — you arrive at them from a URL someone handed you.
//
// The home page's closing band does NOT link to them (it used to, by name,
// and this comment outlived that). Between here and `Nav`, URL-only is the
// whole truth.
// Notes는 글이 한 편이라도 있을 때만 나타난다. `/notes`는 비어 있으면
// `notFound()`를 부르므로, 조건 없이 링크하면 푸터에서 404로 가는 길이 생긴다.
// 첫 글을 `data/notes.ts`에 넣는 순간 여기와 sitemap과 RSS가 같이 살아난다.
const NAV = [
  { href: '/archive', label: 'Archive' },
  { href: '/shop', label: 'Shop' },
  ...(hasNotes ? [{ href: '/notes', label: 'Notes' }] : []),
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
    //
    // Sized as a footer, not as a final section. It used to run ~500px tall on
    // desktop — a 6xl wordmark, 24 units of padding at each end, and 20 more
    // before the meta rule — so every page ended by scrolling through a screen
    // of chrome. The whole block is scaled down here, and the contrast moves
    // the other way at the same time: the dimmed text (links at 70%, labels and
    // meta at 40%) is lifted, because "smaller" only reads as tidy if the type
    // that remains is easier to read, not fainter.
    <footer className="band-navy texture-grain">
      {/* Canopy gradient hairline capping the band */}
      <div aria-hidden className="h-[2px] bg-gradient-to-r from-forest via-fern to-moss" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-12">
        {/* Five tracks on mobile rather than two. Index needs almost no width
            ("Archive", "Shop"), while Connect carries a 23-character email that
            an even split forced to break mid-word — "…naver.co / m". A 2/3
            split gives the long column the room and leaves the short one what
            it needs. Desktop keeps its own 12-track grid. */}
        <div className="grid grid-cols-5 md:grid-cols-12 gap-y-8 gap-x-5 sm:gap-x-8 items-start">

          {/* Brand — signature wordmark + studio line */}
          <div className="col-span-5 md:col-span-4 space-y-2.5">
            <p className="eyebrow text-moss">Collecting the greenery</p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight leading-none text-cream">
              phorage
            </h2>
            <p className="text-[13px] leading-relaxed text-cream/65 max-w-xs break-keep">
              작은 관심을 기록하고 만들어갑니다.
            </p>
          </div>

          <div className="hidden md:block md:col-span-1" />

          {/* Index */}
          <nav className="col-span-2 md:col-span-3 space-y-3" aria-label="Footer">
            <h3 className="eyebrow text-cream/50">Index</h3>
            <ul className="space-y-2 text-[13px]">
              {NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-cream/80 hover:text-moss transition-colors ${item.italic ? 'italic' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div className="col-span-3 md:col-span-4 space-y-3">
            <h3 className="eyebrow text-cream/50">Connect</h3>
            <ul className="space-y-2 text-[13px]">
              {CONNECT.map(item => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="link-underline text-cream/80 hover:text-moss"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Meta row — thin rule, mono microcopy */}
        <div className="mt-9 md:mt-10 pt-5 border-t border-cream/15 flex flex-col sm:flex-row justify-between gap-2 eyebrow text-cream/50">
          {/* Rendered at request/build time rather than typed in, so the
              footer does not quietly go stale on 1 January. */}
          <span>&copy; {new Date().getFullYear()} phorage studio</span>
          <span>Digital studio · Seoul</span>
        </div>
      </div>
    </footer>
  );
}
