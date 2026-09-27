import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio · English",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
  alternates: {
    canonical: "/en/portfolio",
    languages: { ko: "/portfolio", en: "/en/portfolio", "x-default": "/portfolio" },
  },
};

// Same curated reading as `/portfolio` — three featured projects, the rest in
// Explore — so the two halves of the hreflang pair show the same page.
export default function EnglishPortfolioPage() {
  return <PortfolioOverview locale="en" mode="submission" route="normal" />;
}
