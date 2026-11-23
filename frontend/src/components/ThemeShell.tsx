"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPortfolioFocusedPath } from '@/data/portfolioRouting';
import { hidesSiteChrome } from '@/lib/chrome';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortfolioFocused = isPortfolioFocusedPath(pathname);
  // Nav/Footer가 빠지는 경로(포트폴리오 제출본, /admin)는 Nav 높이만큼의
  // 본문 여백도 같이 뺀다. 판정은 `lib/chrome` 한 곳에서.
  const chromeless = hidesSiteChrome(pathname);

  // /lab used to force forest-black here. It no longer does: a dark console
  // between a light header and a light footer is a hole in the page, not a
  // mode. The console carries the site's own light theme now, so the body it
  // sits on is the same canvas every other route uses.
  // 바탕색은 body가 아니라 본문 영역(`#main-content`, `layout.tsx`)과 루트(`html`,
  // `globals.css`)가 칠한다. iOS Safari 26은 화면 아래 툴바 영역과 튕김 영역을
  // 루트·body 배경에서 가져오는데, body가 크림색이면 짙은 푸터 아래가 늘 흰색으로
  // 남았다. body를 비워 두면 그 자리는 루트 색 하나로 정해진다.
  const bgColor = 'bg-transparent';
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

  // iOS Safari는 주소창 뒤와 화면 끝에서 튕겨 보이는 자리를 문서 맨 바깥(루트)의
  // 배경색으로 칠한다. 페이지 바탕은 `<body>`의 크림색이라, 짙은 숲색 푸터까지
  // 내려가도 그 자리는 흰색에 가깝게 남았다. 푸터가 화면에 보이는 동안만 루트를
  // 푸터 색으로 바꾼다(`globals.css`의 `html[data-footer-in-view]`) — 맨 위에서
  // 끌어내릴 때는 계속 크림색이다. 푸터가 없는 경로(관리 화면 등)는 표시가 없다.
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
