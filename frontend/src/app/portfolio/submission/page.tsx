import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio — Submission View",
  description: "A focused submission view of Sangmin Lee's portfolio and seven evidence-led case studies.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioSubmissionPage() {
  return <PortfolioOverview locale="en" mode="submission" />;
}
