import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { PORTFOLIO_CARD, shareCard } from "@/lib/share-card";
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
    alternates: {
      canonical: `/portfolio/${slug}`,
      languages: {
        ko: `/portfolio/${slug}`,
        en: `/en/portfolio/${slug}`,
        "x-default": `/portfolio/${slug}`,
      },
    },
    ...shareCard({
      title: project.title,
      description: project.summary,
      path: `/portfolio/${slug}`,
      images: [PORTFOLIO_CARD],
    }),
  };
}

export default async function PortfolioCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = portfolio.getProject(slug);
  if (!project) notFound();
  return (
    <PortfolioCaseStudy
      project={project}
      projects={portfolio.projects}
      locale="ko"
      route="normal"
    />
  );
}
