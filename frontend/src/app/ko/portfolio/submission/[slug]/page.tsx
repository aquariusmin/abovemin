import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { getKoreanPortfolioProject, koreanPortfolioProjects } from "@/data/portfolio.ko";

export const dynamicParams = false;

export function generateStaticParams() {
  return koreanPortfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getKoreanPortfolioProject(slug);
  if (!project) notFound();
  return {
    title: `${project.title} — 제출용`,
    description: project.summary,
    robots: { index: false, follow: false },
    alternates: { canonical: `/ko/portfolio/${slug}` },
  };
}

export default async function KoreanPortfolioSubmissionCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getKoreanPortfolioProject(slug);
  if (!project) notFound();
  return <PortfolioCaseStudy project={project} projects={koreanPortfolioProjects} locale="ko" mode="submission" />;
}
