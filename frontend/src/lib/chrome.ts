import { isPortfolioFocusedPath } from '@/data/portfolioRouting';

// Nav, Footer, ThemeShell의 여백이 같은 판정을 써야 한다 — 어긋나면 빈 띠나 덮인 제목이 생긴다.
export function isAdminPath(pathname?: string | null): boolean {
  return pathname === '/admin' || !!pathname?.startsWith('/admin/');
}

export function hidesSiteChrome(pathname?: string | null): boolean {
  return isPortfolioFocusedPath(pathname) || isAdminPath(pathname);
}
