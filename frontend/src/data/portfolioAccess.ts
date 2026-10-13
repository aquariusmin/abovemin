import { portfolioProjects, type PortfolioProject } from "@/data/portfolio";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";
import {
  archivePortfolioSlugs,
  curatePortfolioProjects,
  featuredPortfolioSlugs,
} from "@/data/portfolioCuration";
import type { PortfolioLocale } from "@/data/portfolioRouting";

export type Portfolio = {
  /** The three projects that lead the overview, numbered `01…03`. */
  featured: PortfolioProject[];
  /** Everything else, demoted to Explore and numbered `A01…`. */
  archive: PortfolioProject[];
  /** `featured` then `archive` — the order the case pages, their prev/next
   *  links and the print sheet all follow. */
  projects: PortfolioProject[];
  /** Looks a project up in `projects`, so it carries its curated number. */
  getProject: (slug: string) => PortfolioProject | undefined;
  /** Every slug in data-file order, for `generateStaticParams`. Same set as
   *  `projects`; the order is the one the case pages have always been
   *  prerendered in, which keeps their prerendered output stable. */
  slugs: string[];
};

/**
 * The one place that knows a locale has its own data file.
 *
 * Both files hold the same nine projects in the same data order; the curated
 * reading (`portfolioCuration.ts`) re-orders and renumbers them identically
 * for both, so "Case 01" names the same project in either language.
 */
function build(source: readonly PortfolioProject[]): Portfolio {
  const featured = curatePortfolioProjects(source, featuredPortfolioSlugs);
  const archive = curatePortfolioProjects(source, archivePortfolioSlugs, "A");
  const projects = [...featured, ...archive];
  return {
    featured,
    archive,
    projects,
    getProject: (slug) => projects.find((project) => project.slug === slug),
    slugs: source.map((project) => project.slug),
  };
}

const portfolios: Record<PortfolioLocale, Portfolio> = {
  ko: build(koreanPortfolioProjects),
  en: build(portfolioProjects),
};

export function getPortfolio(locale: PortfolioLocale): Portfolio {
  return portfolios[locale];
}
