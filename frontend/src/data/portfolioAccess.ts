import { portfolioProjects, type PortfolioProject } from "@/data/portfolio";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";
import {
  archivePortfolioSlugs,
  curatePortfolioProjects,
  featuredPortfolioSlugs,
} from "@/data/portfolioCuration";
import type { PortfolioLocale } from "@/data/portfolioRouting";

export type Portfolio = {
  featured: PortfolioProject[];
  archive: PortfolioProject[];
  projects: PortfolioProject[];
  getProject: (slug: string) => PortfolioProject | undefined;
  slugs: string[];
};

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
