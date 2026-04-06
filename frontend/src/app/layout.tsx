"use client";

import './globals.css';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useState, useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bgColor = isLab ? 'bg-[#1a1c1a]' : 'bg-[#FAF9F6]';
  const textColor = isLab ? 'text-white' : 'text-[#222]';
  const navBg = isLab ? 'bg-[#1a1c1a]/90' : 'bg-[#FAF9F6]/95';
  const footerBg = isLab ? 'bg-[#1a1c1a]' : 'bg-[#F0EEEA]';
  const borderColor = isLab ? 'border-white/10' : 'border-black/5';
  const accentColor = isLab ? 'text-[#6B8E6B]' : 'text-[#4A5D4E]';
  const cartCount = useCartStore(state => state.totalCount());
  const displayCount = mounted ? cartCount : 0;

  const footerHeading = isLab ? 'text-[#6B8E6B]' : 'text-[#4A5D4E]';
  const footerSubHeading = isLab ? 'text-white/40' : 'text-black/50';
  const footerBody = isLab ? 'text-white/70' : 'text-black/90';

  const navLinks = [
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    { href: '/lab', label: 'Lab', italic: true },
  ];

  return (
    <html lang="ko" className={`${bgColor} transition-colors duration-500`}>
      <body className={`${bgColor} ${textColor} transition-colors duration-500 antialiased flex flex-col min-h-screen`}>

        {/* Navigation */}
        <nav className={`fixed top-0 left-0 w-full z-50 font-serif border-b ${borderColor} ${navBg} backdrop-blur-md transition-all`}>
          <div className="grid grid-cols-3 items-center px-6 md:px-10 py-5 md:py-7 max-w-[1920px] mx-auto">

            {/* Left: tagline (desktop only) */}
            <div className="text-[10px] tracking-[0.2em] uppercase opacity-50 font-sans hidden md:block italic">
              Seoul / 2026
            </div>

            {/* Center: logo */}
            <a href="/" className="flex justify-center" onClick={() => setMenuOpen(false)}>
              <h1 className={`text-xl md:text-2xl font-bold tracking-tighter ${accentColor} transition-colors`}>
                phorage
              </h1>
            </a>

            {/* Right: desktop links + mobile controls */}
            <div className="flex justify-end items-center gap-6 md:gap-10">
              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-10 text-[11px] uppercase tracking-widest font-sans font-bold">
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`hover:opacity-50 transition-all ${link.italic ? 'italic' : ''} ${
                      pathname?.startsWith(link.href)
                        ? isLab && link.href === '/lab' ? 'text-[#6B8E6B]' : 'text-black border-b-2 border-[#4A5D4E]'
                        : link.href === '/lab' ? 'opacity-30 hover:opacity-100' : 'text-gray-400'
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                <a href="/cart" className="relative">
                  <span className={`text-[11px] ${pathname === '/cart' ? (isLab ? 'text-[#6B8E6B]' : 'text-black') : 'text-gray-400'} hover:opacity-50 transition-all`}>
                    Bag
                  </span>
                  {displayCount > 0 && (
                    <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-[#4A5D4E] text-white text-[8px] flex items-center justify-center font-bold">
                      {displayCount}
                    </span>
                  )}
                </a>
              </div>

              {/* Mobile: cart + hamburger */}
              <div className="flex md:hidden items-center gap-5">
                <a href="/cart" className="relative" onClick={() => setMenuOpen(false)}>
                  <span className={`text-[11px] font-sans font-bold uppercase tracking-widest ${pathname === '/cart' ? accentColor : 'text-gray-400'}`}>
                    Bag
                  </span>
                  {displayCount > 0 && (
                    <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full bg-[#4A5D4E] text-white text-[8px] flex items-center justify-center font-bold">
                      {displayCount}
                    </span>
                  )}
                </a>
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
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-[13px] font-sans font-bold uppercase tracking-widest ${link.italic ? 'italic' : ''} ${
                    pathname?.startsWith(link.href) ? accentColor : isLab ? 'text-white/60' : 'text-gray-400'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className={`flex-grow pt-[72px] md:pt-[88px] ${bgColor}`}>
          {children}
        </div>

        {/* Footer */}
        <footer className={`py-10 px-6 md:px-10 border-t ${borderColor} ${footerBg} transition-colors duration-500`}>
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 font-sans">

            <div className="space-y-6 col-span-2 md:col-span-1">
              <h4 className={`font-serif text-2xl font-bold ${footerHeading}`}>phorage</h4>
              <p className={`text-[13px] leading-relaxed font-medium ${footerBody}`}>
                빛을 수집하고 세상을 분석합니다. <br />
                어제와 오늘의 경계에서 발견한 <br />
                가장 정직하고 따뜻한 기록들.
              </p>
            </div>

            <div className="space-y-6">
              <h5 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${footerSubHeading}`}>Index</h5>
              <ul className={`text-[13px] space-y-3 font-semibold ${footerBody}`}>
                <li><a href="/archive" className="hover:text-[#4A5D4E] transition-colors">Archive</a></li>
                <li><a href="/shop" className="hover:text-[#4A5D4E] transition-colors">Shop</a></li>
                <li><a href="/lab" className="hover:text-[#4A5D4E] transition-colors italic">The Lab</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${footerSubHeading}`}>Connect</h5>
              <p className={`text-[13px] font-semibold leading-relaxed ${footerBody}`}>
                phorage.studio@gmail.com <br />
                <span className="mt-2 block hover:underline cursor-pointer">@phorage_archive</span>
              </p>
            </div>

            <div className="space-y-6">
              <h5 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${footerSubHeading}`}>Hour</h5>
              <p className={`text-[13px] italic font-serif ${footerBody}`}>
                Tue - Sat : 11:00 - 19:00 <br />
                Sun - Mon : Closed
              </p>
            </div>
          </div>

          <div className={`max-w-7xl mx-auto mt-10 pt-10 border-t ${isLab ? 'border-white/5' : 'border-black/5'} flex justify-between items-center text-[10px] uppercase tracking-[0.4em] font-bold ${footerSubHeading}`}>
            <span>© 2026 phorage studio.</span>
            <span className="hover:text-black transition-colors cursor-help">Digital Studio by Sangmin</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
