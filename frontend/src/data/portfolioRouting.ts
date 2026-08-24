/**
 * Two independent axes, deliberately kept apart.
 *
 * `PortfolioMode` is the PRESENTATION: `submission` is the curated reading —
 * three defensible projects up front, everything else demoted to an Explore
 * archive, and copy written for someone screening a candidate. `normal` is the
 * old flat list of every project in data order.
 *
 * `PortfolioRoute` is which URL family the links belong to. It used to be the
 * same value, and that coupling is what made `/portfolio` and
 * `/portfolio/submission` two different pages rather than one page reachable
 * two ways. `/portfolio` now renders the `submission` PRESENTATION while
 * staying on the `portfolio` ROUTE, so the public, indexed URLs are the ones
 * carrying the good version — the noindex `/portfolio/submission` family stays
 * put for links already handed out.
 *
 * Everything downstream takes both and defaults `route` to `mode`, so a call
 * site that never cared keeps its old behaviour.
 */
export type PortfolioMode = "normal" | "submission";
export type PortfolioRoute = PortfolioMode;
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
