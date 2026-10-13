import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import {
  getKoreanPortfolioProject,
  getKoreanSubmissionPortfolioProject,
  getKoreanSubmissionPortfolioProjects,
  koreanPortfolioProjects,
} from "@/data/portfolio.ko";

export const dynamicParams = false;

// The submission set is a re-ordering and re-numbering of the same nine
// projects, not a subset, so every slug that resolved before still resolves.
export function generateStaticParams() {
  return koreanPortfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getKoreanPortfolioProject(slug);
  if (!project) notFound();
  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: `/portfolio/${slug}`,
      languages: {
        ko: `/portfolio/${slug}`,
        en: `/en/portfolio/${slug}`,
        "x-default": `/portfolio/${slug}`,
      },
    },
  };
}

export default async function PortfolioCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Submission ORDERING so case numbers and prev/next match the cards the
  // reader just clicked; `route="normal"` so the links stay on /portfolio.
  const project = getKoreanSubmissionPortfolioProject(slug);
  if (!project) notFound();
  return (
    <PortfolioCaseStudy
      project={project}
      projects={getKoreanSubmissionPortfolioProjects()}
      locale="ko"
      mode="submission"
      route="normal"
    />
  );
}
