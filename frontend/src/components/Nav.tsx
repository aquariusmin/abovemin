"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { hidesSiteChrome } from '@/lib/chrome';

export default function Nav() {
  const pathname = usePathname();
  const chromeless = hidesSiteChrome(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Close on route change — covers in-page links and browser back/forward,
  // which a click handler on the links alone would miss. Adjusted during render
  // rather than in an effect, so there is no extra render pass with a stale
  // open menu (see React's "adjusting state when a prop changes").
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Escape closes and returns focus to the toggle; a pointer press outside the
  // nav closes without stealing focus.
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    }
    function onPointerDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const cartCount = useCartStore(state => state.totalCount());
  const displayCount = mounted ? cartCount : 0;

  // Lime marks the active route, everywhere.
  // /lab is no longer a dark route, so the nav no longer inverts for it. One
  // header treatment for every page is the point: the console has to read as
  // part of this site, and a bar that changes colour under it says otherwise.
  const shell = 'bg-canvas/80 border-border/70';
  const logoColor = 'text-forest';
  const idleLink = 'text-muted-foreground';
  const activeLink = 'text-primary';
  const hoverLink = 'hover:text-primary';
  const underline = 'bg-moss';
  const divider = 'bg-border';

  // About and Portfolio are deliberately absent.
  //
  // Both pages are live, indexed and in the sitemap; they are simply not in
  // the site's chrome. The bar is the shop-side path through the site (browse,
  // collect, buy), and the portfolio is handed out by URL.
  //
  // To be precise about what that means today: NOTHING on the site links to
  // either page except `/about`'s own body copy (which links to /portfolio)
  // and the portfolio's closing CTA (which links to /about). They are not in
  // this list, not in the footer's, and not in the home page's closing band.
  // URL-only is the actual state, and it is the intended one — if that ever
  // changes, the footer is the place to put them back.
  const navLinks = [
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    { href: '/lab', label: 'Lab', italic: true },
  ];

  const isActiveLink = (href: string) => pathname?.startsWith(href);

  if (chromeless) return null;

  // Nav labels scale with the viewport instead of sitting at a fixed 11px:
  // cramped where the row is tightest (they only appear from `lg`) and
  // undersized on a wide monitor.
  // 11px at 1024 → 14px from ~1600 up; below `lg` the clamp floors at 11px, so
  // the mobile bar is unchanged. Tracking is in `em`, so it follows along.
  const fluidLabel = 'text-[clamp(0.6875rem,0.52vw+0.35rem,0.875rem)]';

  // The badge hangs off the label, not off the link: the link's box is padded
  // out to a 44px tap target on touch, and a corner of THAT would put the
  // count nowhere near the word it counts.
  const cartBadge = (className: string) => (
    <Link href="/cart" className={className} onClick={() => setMenuOpen(false)}>
      <span className="relative">
        <span className={`eyebrow ${fluidLabel} tracking-[0.18em] ${pathname === '/cart' ? activeLink : idleLink} hover:opacity-60 transition-opacity`}>
          Bag
        </span>
        {displayCount > 0 && (
          <span className="absolute -top-2.5 -right-3.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono flex items-center justify-center">
            {displayCount}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    // Open, the bar and its dropdown become one opaque sheet with a hairline
    // and `shadow-xs` under it. Translucent, the hero photo showed through the
    // blur behind the menu rows and the links read as floating on the picture.
    <nav ref={navRef} className={`fixed top-0 left-0 w-full z-50 border-b transition-colors duration-500 ${menuOpen ? 'bg-canvas border-border shadow-xs' : `${shell} backdrop-blur-xl`}`}>
      {/* 3-column flex: equal-width outer zones keep the wordmark optically
          centered while reserving real space, so nothing can overlap. Desktop
          nav appears at lg; below that we fall back to the hamburger. */}
      <div className="flex items-center gap-4 px-5 sm:px-6 md:px-10 py-2.5 md:py-5 lg:py-6 max-w-[1920px] mx-auto">

        {/* Left: wordmark (mobile/tablet). Empty at `lg` on purpose — the zone
            still reserves its width so the centre wordmark stays centred. */}
        <div className="flex-1 min-w-0 flex items-center justify-start">
          <Link href="/" className="lg:hidden transition-opacity hover:opacity-70" onClick={() => setMenuOpen(false)}>
            <span className={`font-serif text-lg font-semibold tracking-tight ${logoColor} transition-colors`}>
              phorage
            </span>
          </Link>
        </div>

        {/* Center: wordmark (desktop) — a real flow item, not absolute */}
        <Link
          href="/"
          className="hidden lg:flex shrink-0 transition-opacity hover:opacity-70"
          onClick={() => setMenuOpen(false)}
        >
          {/* Explicit leading: an arbitrary font-size carries no line-height of
              its own, and the nav's height is what `pt-[88px]` in the layout is
              compensating for. */}
          <span className={`font-serif text-[clamp(1.375rem,1vw+0.7rem,1.875rem)] leading-[1.15] font-semibold tracking-tight ${logoColor} transition-colors`}>
            phorage
          </span>
        </Link>

        {/* Right: desktop nav + mobile controls */}
        <div className="flex-1 min-w-0 flex items-center justify-end">
          <div className="hidden lg:flex items-center gap-[clamp(1rem,1.9vw,2.5rem)] whitespace-nowrap">
            {navLinks.map(link => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative py-1 eyebrow ${fluidLabel} tracking-[0.18em] transition-colors duration-200 ${hoverLink} ${link.italic ? 'italic' : ''} ${
                    active ? activeLink : idleLink
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -bottom-0.5 left-0 h-px ${underline} transition-all duration-300 ease-out ${
                      active ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
                    }`}
                  />
                </Link>
              );
            })}
            <span aria-hidden className={`h-3.5 w-px ${divider}`} />
            {cartBadge('')}
          </div>

          {/* Touch controls are 44×44 (WCAG 2.5.5 / Apple HIG): the glyphs
              stay the size they were, the hit area grows around them. The
              negative margin keeps the toggle's lines on the page gutter. */}
          <div className="flex lg:hidden items-center gap-1">
            {cartBadge('inline-flex h-11 min-w-11 items-center justify-center px-2')}
            <button
              ref={toggleRef}
              onClick={() => setMenuOpen(prev => !prev)}
              className={`flex h-11 w-11 flex-col items-center justify-center gap-[5px] -mr-3 text-forest`}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / tablet dropdown.
          `inert` while collapsed: max-height only clips the panel visually, so
          without it the links stay in the tab order behind a closed menu. */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-72' : 'max-h-0'}`}
      >
        <div className={`border-t border-border/70 px-5 sm:px-6 md:px-10 py-3 flex flex-col`}>
          {navLinks.map(link => {
            const active = isActiveLink(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 items-center gap-3 eyebrow text-xs tracking-[0.2em] transition-colors ${link.italic ? 'italic' : ''} ${
                  active ? activeLink : idleLink
                }`}
              >
                <span aria-hidden className={`h-3 w-px transition-colors ${active ? underline : 'bg-transparent'}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
