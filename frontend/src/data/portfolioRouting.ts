/**
 * One presentation, two URL families.
 *
 * There is a single portfolio page: the curated reading — three defensible
 * projects up front, everything else demoted to an Explore archive, copy
 * written for someone screening a candidate (`portfolioCuration.ts`,
 * `portfolioAccess.ts`). It is reachable two ways, and `PortfolioRoute` says
 * which family a page's links stay in:
 *
 * - `normal` — `/portfolio/...`, the public, indexed URLs.
 * - `submission` — `/portfolio/submission/...`, `noindex`, kept valid for
 *   links already handed out.
 *
 * There used to be a second axis, `PortfolioMode`, that picked between this
 * presentation and an older flat list of every project. Every route had moved
 * to the curated one, so the flat list and the axis were removed. The page
 * components require `route`, so each route file states its own family.
 */
export type PortfolioRoute = "normal" | "submission";
export type PortfolioLocale = "en" | "ko";

// Korean is the default locale and lives at the unprefixed path; English sits under /en.
export function getPortfolioBasePath(locale: PortfolioLocale, route: PortfolioRoute) {
  const localePrefix = locale === "en" ? "/en" : "";
  return `${localePrefix}/portfolio${route === "submission" ? "/submission" : ""}`;
}

export function getPortfolioCasePath(
  locale: PortfolioLocale,
  route: PortfolioRoute,
  slug: string,
) {
  return `${getPortfolioBasePath(locale, route)}/${slug}`;
}

export function getPortfolioPrintPath(locale: PortfolioLocale, route: PortfolioRoute) {
  const path = locale === "en" ? "/en/portfolio/print" : "/portfolio/print";
  return route === "submission" ? `${path}?from=submission` : path;
}

export function isPortfolioFocusedPath(pathname?: string | null) {
  if (!pathname) return false;
  const path = pathname.startsWith("/en/") ? pathname.slice(3) : pathname;
  return (
    path === "/portfolio/print" ||
    path === "/portfolio/submission" ||
    path.startsWith("/portfolio/submission/")
  );
}
