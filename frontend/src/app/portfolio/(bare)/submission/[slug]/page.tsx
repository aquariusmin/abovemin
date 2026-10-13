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
    robots: { index: false, follow: false },
    alternates: { canonical: `/portfolio/${slug}` },
  };
}

export default async function PortfolioSubmissionCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getKoreanSubmissionPortfolioProject(slug);
  if (!project) notFound();
  return <PortfolioCaseStudy project={project} projects={getKoreanSubmissionPortfolioProjects()} locale="ko" mode="submission" />;
}
