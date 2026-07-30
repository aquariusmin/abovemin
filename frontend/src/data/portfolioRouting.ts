export type PortfolioMode = "normal" | "submission";
export type PortfolioLocale = "en" | "ko";

// Korean is the default locale and lives at the unprefixed path; English sits under /en.
export function getPortfolioBasePath(locale: PortfolioLocale, mode: PortfolioMode) {
  const localePrefix = locale === "en" ? "/en" : "";
  return `${localePrefix}/portfolio${mode === "submission" ? "/submission" : ""}`;
}

export function getPortfolioCasePath(
  locale: PortfolioLocale,
  mode: PortfolioMode,
  slug: string,
) {
  return `${getPortfolioBasePath(locale, mode)}/${slug}`;
}

export function getPortfolioPrintPath(locale: PortfolioLocale, mode: PortfolioMode) {
  const path = locale === "en" ? "/en/portfolio/print" : "/portfolio/print";
  return mode === "submission" ? `${path}?from=submission` : path;
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
