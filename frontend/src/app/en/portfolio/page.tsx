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

export default function EnglishPortfolioPage() {
  return <PortfolioOverview locale="en" />;
}
