"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';
import { hidesSiteChrome } from '@/lib/chrome';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);
  const chromeless = hidesSiteChrome(pathname);

  // body는 비워 둔다: iOS Safari 26은 툴바·튕김 영역 색을 루트·body 배경에서 가져온다.
  const bgColor = 'bg-transparent';
  const textColor = 'text-ink-body';

  // Document lang follows the URL, on the client: the root layout can't read the pathname without going dynamic.
  const lang = pathname?.startsWith('/en') ? 'en' : 'ko';
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // 푸터가 보이는 동안만 루트를 푸터 색으로(`html[data-footer-in-view]`) — iOS Safari 튕김 영역용.
  useEffect(() => {
    const root = document.documentElement;
    const footer = document.querySelector('footer[data-site-footer]');
    if (!footer) {
      root.removeAttribute('data-footer-in-view');
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      root.toggleAttribute('data-footer-in-view', entry.isIntersecting);
    });
    observer.observe(footer);
    return () => {
      observer.disconnect();
      root.removeAttribute('data-footer-in-view');
    };
  }, [pathname]);

  useEffect(() => {
    function blockContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    }
    document.addEventListener('contextmenu', blockContextMenu);
    return () => document.removeEventListener('contextmenu', blockContextMenu);
  }, []);

  return (
    <body className={`${bgColor} ${textColor} ${isPortfolioFocused ? 'portfolio-focused-route' : ''} ${chromeless ? 'chromeless-route' : ''} transition-colors duration-500 antialiased flex flex-col min-h-screen`}>
      {children}
    </body>
  );
}
