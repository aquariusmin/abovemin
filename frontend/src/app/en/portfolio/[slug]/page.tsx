import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { getPortfolioProject, portfolioProjects } from "@/data/portfolio";

export const dynamicParams = false;

export function generateStaticParams() {
  return portfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProject(slug);
  if (!project) notFound();
  return {
    title: `${project.title} · English`,
    description: project.summary,
    alternates: {
      canonical: `/en/portfolio/${slug}`,
      languages: {
        ko: `/portfolio/${slug}`,
        en: `/en/portfolio/${slug}`,
        "x-default": `/portfolio/${slug}`,
      },
    },
  };
}

export default async function EnglishPortfolioCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getPortfolioProject(slug);
  if (!project) notFound();
  return <PortfolioCaseStudy project={project} projects={portfolioProjects} locale="en" />;
}
