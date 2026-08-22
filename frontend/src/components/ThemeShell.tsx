"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);

  // /lab used to force forest-black here. It no longer does: a dark console
  // between a light header and a light footer is a hole in the page, not a
  // mode. The console carries the site's own light theme now, so the body it
  // sits on is the same canvas every other route uses.
  const bgColor = 'bg-canvas';
  const textColor = 'text-ink-body';

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
    <body className={`${bgColor} ${textColor} ${isPortfolioFocused ? 'portfolio-focused-route' : ''} transition-colors duration-500 antialiased flex flex-col min-h-screen`}>
      {children}
    </body>
  );
}
