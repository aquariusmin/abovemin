"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

export default function Nav() {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const navBg = isLab ? 'bg-[#1a1c1a]/90' : 'bg-[#FAF9F6]/95';
  const borderColor = isLab ? 'border-white/10' : 'border-black/5';
  const accentColor = isLab ? 'text-accent-light' : 'text-accent';
  const cartCount = useCartStore(state => state.totalCount());
  const displayCount = mounted ? cartCount : 0;

  const navLinks = [
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    { href: '/lab', label: 'Lab', italic: true },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 font-serif border-b ${borderColor} ${navBg} backdrop-blur-md transition-all`}>
      <div className="grid grid-cols-3 items-center px-6 md:px-10 py-5 md:py-7 max-w-[1920px] mx-auto">

        {/* Left: tagline (desktop only) */}
        <div className="text-[10px] tracking-[0.2em] uppercase opacity-50 font-sans hidden md:block italic">
          Seoul / 2026
        </div>

        {/* Center: logo */}
        <Link href="/" className="flex justify-center" onClick={() => setMenuOpen(false)}>
          <h1 className={`text-xl md:text-2xl font-bold tracking-tighter ${accentColor} transition-colors`}>
            phorage
          </h1>
        </Link>

        {/* Right: desktop links + mobile controls */}
        <div className="flex justify-end items-center gap-6 md:gap-10">
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-10 text-[11px] uppercase tracking-widest font-sans font-bold">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:opacity-50 transition-all ${link.italic ? 'italic' : ''} ${
                  pathname?.startsWith(link.href)
                    ? isLab && link.href === '/lab' ? 'text-accent-light' : 'text-black border-b-2 border-accent'
                    : link.href === '/lab' ? 'opacity-30 hover:opacity-100' : 'text-gray-400'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/cart" className="relative">
              <span className={`text-[11px] ${pathname === '/cart' ? (isLab ? 'text-accent-light' : 'text-black') : 'text-gray-400'} hover:opacity-50 transition-all`}>
                Bag
              </span>
              {displayCount > 0 && (
                <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-accent text-white text-[8px] flex items-center justify-center font-bold">
                  {displayCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex md:hidden items-center gap-5">
            <Link href="/cart" className="relative" onClick={() => setMenuOpen(false)}>
              <span className={`text-[11px] font-sans font-bold uppercase tracking-widest ${pathname === '/cart' ? accentColor : 'text-gray-400'}`}>
                Bag
              </span>
              {displayCount > 0 && (
                <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-accent text-white text-[8px] flex items-center justify-center font-bold">
                  {displayCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className={`flex flex-col gap-[5px] p-1 ${isLab ? 'text-white' : 'text-[#333]'}`}
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-64' : 'max-h-0'}`}>
        <div className={`border-t ${borderColor} px-6 py-6 flex flex-col gap-6`}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-[13px] font-sans font-bold uppercase tracking-widest ${link.italic ? 'italic' : ''} ${
                pathname?.startsWith(link.href) ? accentColor : isLab ? 'text-white/60' : 'text-gray-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
