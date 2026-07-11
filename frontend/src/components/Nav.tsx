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
  const shell = isLab
    ? 'bg-[#1a1c1a]/85 border-white/10'
    : 'bg-white/80 border-hairline/60';
  const logoColor = isLab ? 'text-white' : 'text-ink';
  const idleLink = isLab ? 'text-white/45' : 'text-muted';
  const activeLink = isLab ? 'text-accent-light' : 'text-ink';

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
    <nav className={`fixed top-0 left-0 w-full z-50 border-b ${shell} backdrop-blur-xl transition-colors duration-500`}>
      <div className="relative flex items-center justify-between px-5 sm:px-6 md:px-10 py-4 md:py-6 max-w-[1920px] mx-auto">

        {/* Left: locale/city marker (desktop) · wordmark (mobile) */}
        <div className="flex items-center">
          <Link href="/" className="md:hidden" onClick={() => setMenuOpen(false)}>
            <span className={`font-serif text-lg font-semibold tracking-tight ${logoColor} transition-colors`}>
              phorage
            </span>
          </Link>
          <span className={`eyebrow hidden md:block ${isLab ? 'text-white/35' : 'text-muted'}`}>
            Seoul · 2026
          </span>
        </div>

        {/* Center: wordmark (desktop) */}
        <Link
          href="/"
          className="hidden md:flex absolute left-1/2 -translate-x-1/2"
          onClick={() => setMenuOpen(false)}
        >
          <span className={`font-serif text-2xl font-semibold tracking-tight ${logoColor} transition-colors`}>
            phorage
          </span>
        </Link>

        {/* Right: desktop nav + mobile controls */}
        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-7 xl:gap-9">
            {navLinks.map(link => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`eyebrow tracking-[0.18em] transition-opacity hover:opacity-60 ${link.italic ? 'italic' : ''} ${
                    active ? activeLink : idleLink
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {cartBadge('')}
          </div>

          <div className="flex md:hidden items-center gap-5">
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

      {/* Mobile dropdown */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-72' : 'max-h-0'}`}>
        <div className={`border-t ${isLab ? 'border-white/10' : 'border-hairline/60'} px-6 py-6 flex flex-col gap-6`}>
          {navLinks.map(link => {
            const active = isActiveLink(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`eyebrow text-xs tracking-[0.2em] ${link.italic ? 'italic' : ''} ${
                  active ? activeLink : idleLink
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
