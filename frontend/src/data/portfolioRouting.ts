// `submission` URLs are noindex and kept valid for links already handed out.
export type PortfolioRoute = "normal" | "submission";
export type PortfolioLocale = "en" | "ko";

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
