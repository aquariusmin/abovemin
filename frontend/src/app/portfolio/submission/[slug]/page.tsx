import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { getPortfolio } from "@/data/portfolioAccess";

const portfolio = getPortfolio("ko");

export const dynamicParams = false;

export function generateStaticParams() {
  return portfolio.slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = portfolio.getProject(slug);
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
  const project = portfolio.getProject(slug);
  if (!project) notFound();
  return <PortfolioCaseStudy project={project} projects={portfolio.projects} locale="ko" route="submission" />;
}
