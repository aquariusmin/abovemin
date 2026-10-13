import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { PORTFOLIO_CARD_EN, shareCard } from "@/lib/share-card";
import {
  getEnglishSubmissionPortfolioProject,
  getEnglishSubmissionPortfolioProjects,
  getPortfolioProject,
  portfolioProjects,
} from "@/data/portfolio";

export const dynamicParams = false;

export function generateStaticParams() {
  return portfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProject(slug);
  if (!project) notFound();
  const title = `${project.title} · English`;
  return {
    title,
    description: project.summary,
    alternates: {
      canonical: `/en/portfolio/${slug}`,
      languages: {
        ko: `/portfolio/${slug}`,
        en: `/en/portfolio/${slug}`,
        "x-default": `/portfolio/${slug}`,
      },
    },
    // The card carries this case study's own title and summary instead of the
    // site default (`shareCard`), labelled as English.
    ...shareCard({
      title,
      description: project.summary,
      path: `/en/portfolio/${slug}`,
      locale: "en_US",
      images: [PORTFOLIO_CARD_EN],
    }),
  };
}

export default async function EnglishPortfolioCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Curated ordering so case numbers and prev/next match /en/portfolio and the
  // Korean page; `route="normal"` keeps the links on /en/portfolio.
  const project = getEnglishSubmissionPortfolioProject(slug);
  if (!project) notFound();
  return (
    <PortfolioCaseStudy
      project={project}
      projects={getEnglishSubmissionPortfolioProjects()}
      locale="en"
      mode="submission"
      route="normal"
    />
  );
}
