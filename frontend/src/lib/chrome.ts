import { isPortfolioFocusedPath } from '@/data/portfolioRouting';

/**
 * 공개 사이트의 머리(Nav)와 꼬리(Footer)를 빼야 하는 경로.
 *
 * 포트폴리오 제출본·인쇄 화면은 원래부터 크롬 없이 떴다. `/admin`은 아니어서,
 * 관리 화면이 BAG 링크 달린 쇼핑 내비와 푸터 사이에 끼어 있었다 — 방문자가
 * 보는 화면의 일부처럼 보이고, 관리 중에 BAG을 눌러 사이트로 튀어 나갈 수
 * 있었다.
 *
 * 판정을 한 곳에 두는 이유: Nav, Footer, 그리고 Nav 높이만큼 본문을 내리는
 * 여백(ThemeShell의 body 클래스)이 같은 답을 내야 한다. 셋 중 하나만 어긋나면
 * 빈 72px 띠나 내비에 덮인 제목이 생긴다.
 */
export function isAdminPath(pathname?: string | null): boolean {
  return pathname === '/admin' || !!pathname?.startsWith('/admin/');
}

export function hidesSiteChrome(pathname?: string | null): boolean {
  return isPortfolioFocusedPath(pathname) || isAdminPath(pathname);
}
