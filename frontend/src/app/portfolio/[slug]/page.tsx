import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioCaseStudy from "@/components/portfolio/PortfolioCaseStudy";
import { PORTFOLIO_CARD, shareCard } from "@/lib/share-card";
import { getPortfolio } from "@/data/portfolioAccess";

const portfolio = getPortfolio("ko");

export const dynamicParams = false;

// The curated list is a re-ordering and re-numbering of the same nine
// projects, not a subset, so every slug in the data file resolves.
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
    // The card carries this case study's own title and summary instead of the
    // site default (`shareCard`).
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
  // Curated ordering so case numbers and prev/next match the cards the reader
  // just clicked; `route="normal"` so the links stay on /portfolio.
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
