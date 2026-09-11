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

  // Document language follows the URL.
  //
  // `/en/portfolio` and its children are English, and their `<main>` elements
  // already say `lang="en"` — but the DOCUMENT was declared `ko` by the root
  // layout, so an English page announced itself as Korean. A screen reader
  // picks the voice from `<html lang>` first, and a Korean voice reading
  // English prose is the failure this fixes.
  //
  // It has to happen here because a root layout in the App Router cannot see
  // the pathname, and reading it from a header would make every one of the 71
  // prerendered pages dynamic. The limitation of doing it on the client: the
  // initial HTML still ships `lang="ko"`, so a crawler that never runs JS sees
  // the old value. The `hreflang` alternates and the `lang="en"` on `<main>`
  // are what carry that case. Making the served HTML correct as well means
  // splitting the root layout in two with route groups — `(ko)` and `(en)`,
  // each rendering its own `<html>` — which is the real fix if this page ever
  // needs to rank in English.
  const lang = pathname?.startsWith('/en') ? 'en' : 'ko';
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
