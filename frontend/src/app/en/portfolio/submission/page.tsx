import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio · English",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/en/portfolio" },
};

export default function EnglishPortfolioSubmissionPage() {
  return <PortfolioOverview locale="en" mode="submission" />;
}
