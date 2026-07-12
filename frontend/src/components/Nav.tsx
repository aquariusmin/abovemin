"use client";

import { useState, useEffect } from 'react';
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
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const cartCount = useCartStore(state => state.totalCount());
  const displayCount = mounted ? cartCount : 0;

  // Surface-aware palette: light editorial canvas vs. dark lab shell.
  const logoColor = isLab ? 'text-white' : 'text-ink';
  const idleLink = isLab ? 'text-white/45' : 'text-muted';
  const activeLink = isLab ? 'text-accent-light' : 'text-ink';
  const hoverLink = isLab ? 'hover:text-white' : 'hover:text-ink';
  const underline = isLab ? 'bg-accent-light' : 'bg-accent';
  const divider = isLab ? 'bg-white/15' : 'bg-hairline';

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    { href: '/lab', label: 'Lab', italic: true },
  ];

  const isActiveLink = (href: string) =>
    href === '/portfolio'
      ? pathname?.startsWith('/portfolio') || pathname?.startsWith('/ko/portfolio')
      : pathname?.startsWith(href);

  if (isPortfolioFocused) return null;

  const cartBadge = (className: string) => (
    <Link href="/cart" className={`relative ${className}`} onClick={() => setMenuOpen(false)}>
      <span className={`eyebrow tracking-[0.18em] ${pathname === '/cart' ? activeLink : idleLink} hover:opacity-60 transition-opacity`}>
        Bag
      </span>
      {displayCount > 0 && (
        <span className="absolute -top-2.5 -right-3.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[9px] font-mono flex items-center justify-center">
          {displayCount}
        </span>
      )}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-3 sm:px-4 md:px-6 pt-3 md:pt-4">
      <div className="glass max-w-[1920px] mx-auto rounded-[1.75rem] overflow-hidden">
      {/* 3-column flex: equal-width outer zones keep the wordmark optically
          centered while reserving real space, so nothing can overlap. Desktop
          nav appears at lg; below that we fall back to the hamburger. */}
      <div className="flex items-center gap-4 px-5 sm:px-6 md:px-10 py-4 md:py-6">

        {/* Left: wordmark (mobile/tablet) · locale marker (desktop) */}
        <div className="flex-1 min-w-0 flex items-center justify-start">
          <Link href="/" className="lg:hidden transition-opacity hover:opacity-70" onClick={() => setMenuOpen(false)}>
            <span className={`font-serif text-lg font-semibold tracking-tight ${logoColor} transition-colors`}>
              phorage
            </span>
          </Link>
          <span className={`eyebrow hidden lg:block whitespace-nowrap ${isLab ? 'text-white/35' : 'text-muted'}`}>
            Seoul · 2026
          </span>
        </div>

        {/* Center: wordmark (desktop) — a real flow item, not absolute */}
        <Link
          href="/"
          className="hidden lg:flex shrink-0 transition-opacity hover:opacity-70"
          onClick={() => setMenuOpen(false)}
        >
          <span className={`font-serif text-2xl font-semibold tracking-tight ${logoColor} transition-colors`}>
            phorage
          </span>
        </Link>

        {/* Right: desktop nav + mobile controls */}
        <div className="flex-1 min-w-0 flex items-center justify-end">
          <div className="hidden lg:flex items-center gap-6 xl:gap-9 whitespace-nowrap">
            {navLinks.map(link => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative py-1 eyebrow tracking-[0.18em] transition-colors duration-200 ${hoverLink} ${link.italic ? 'italic' : ''} ${
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
              onClick={() => setMenuOpen(prev => !prev)}
              className={`flex flex-col gap-[5px] p-2 -mr-2 ${isLab ? 'text-white' : 'text-ink'}`}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / tablet dropdown */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-72' : 'max-h-0'}`}>
        <div className={`border-t ${isLab ? 'border-white/10' : 'border-hairline/60'} px-6 py-6 flex flex-col gap-1`}>
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
      </div>
    </nav>
  );
}
