import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioSubmissionPage() {
  return <PortfolioOverview locale="en" mode="submission" />;
}
