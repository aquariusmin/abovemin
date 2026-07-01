export type PortfolioMode = "normal" | "submission";
export type PortfolioLocale = "en" | "ko";

export function getPortfolioBasePath(locale: PortfolioLocale, mode: PortfolioMode) {
  const localePrefix = locale === "ko" ? "/ko" : "";
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
  const path = locale === "ko" ? "/ko/portfolio/print" : "/portfolio/print";
  return mode === "submission" ? `${path}?from=submission` : path;
}

export function isPortfolioFocusedPath(pathname?: string | null) {
  return (
    pathname === "/portfolio/print" ||
    pathname === "/ko/portfolio/print" ||
    pathname === "/portfolio/submission" ||
    pathname?.startsWith("/portfolio/submission/") ||
    pathname === "/ko/portfolio/submission" ||
    pathname?.startsWith("/ko/portfolio/submission/") ||
    false
  );
}
