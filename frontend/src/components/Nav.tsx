"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';

export default function Nav() {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);
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

  // Surface-aware palette: warm paper canvas vs. forest-black lab shell.
  // Both surfaces share one accent language — lime marks the active route.
  const shell = isLab
    ? 'bg-forest-black/85 border-white/10'
    : 'bg-canvas/80 border-border/70';
  const logoColor = isLab ? 'text-cream' : 'text-forest';
  const idleLink = isLab ? 'text-cream/65' : 'text-muted-foreground';
  const activeLink = isLab ? 'text-moss' : 'text-primary';
  const hoverLink = isLab ? 'hover:text-cream' : 'hover:text-primary';
  const underline = 'bg-moss';
  const divider = isLab ? 'bg-white/15' : 'bg-border';

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    { href: '/lab', label: 'Lab', italic: true },
  ];

  const isActiveLink = (href: string) =>
    href === '/portfolio'
      ? pathname?.startsWith('/portfolio') || pathname?.startsWith('/en/portfolio')
      : pathname?.startsWith(href);

  if (isPortfolioFocused) return null;

  // Nav labels scale with the viewport instead of sitting at a fixed 11px:
  // cramped where the row is tightest (they only appear from `lg`, where five
  // labels plus the wordmark barely fit) and undersized on a wide monitor.
  // 11px at 1024 → 14px from ~1600 up; below `lg` the clamp floors at 11px, so
  // the mobile bar is unchanged. Tracking is in `em`, so it follows along.
  const fluidLabel = 'text-[clamp(0.6875rem,0.52vw+0.35rem,0.875rem)]';

  const cartBadge = (className: string) => (
    <Link href="/cart" className={`relative ${className}`} onClick={() => setMenuOpen(false)}>
      <span className={`eyebrow ${fluidLabel} tracking-[0.18em] ${pathname === '/cart' ? activeLink : idleLink} hover:opacity-60 transition-opacity`}>
        Bag
      </span>
      {displayCount > 0 && (
        <span className="absolute -top-2.5 -right-3.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono flex items-center justify-center">
          {displayCount}
        </span>
      )}
    </Link>
  );

  return (
    <nav ref={navRef} className={`fixed top-0 left-0 w-full z-50 border-b ${shell} backdrop-blur-xl transition-colors duration-500`}>
      {/* 3-column flex: equal-width outer zones keep the wordmark optically
          centered while reserving real space, so nothing can overlap. Desktop
          nav appears at lg; below that we fall back to the hamburger. */}
      <div className="flex items-center gap-4 px-5 sm:px-6 md:px-10 py-4 md:py-6 max-w-[1920px] mx-auto">

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

          <div className="flex lg:hidden items-center gap-5">
            {cartBadge('')}
            <button
              ref={toggleRef}
              onClick={() => setMenuOpen(prev => !prev)}
              className={`flex flex-col gap-[5px] p-2 -mr-2 ${isLab ? 'text-cream' : 'text-forest'}`}
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
        <div className={`border-t ${isLab ? 'border-white/10' : 'border-border/70'} px-6 py-6 flex flex-col gap-1`}>
          {navLinks.map(link => {
            const active = isActiveLink(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 py-2.5 eyebrow text-xs tracking-[0.2em] transition-colors ${link.italic ? 'italic' : ''} ${
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
