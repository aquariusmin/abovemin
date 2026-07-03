import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
  alternates: {
    canonical: "/portfolio",
    languages: { en: "/portfolio", ko: "/ko/portfolio" },
  },
};

export default function PortfolioPage() {
  return <PortfolioOverview locale="en" />;
}
