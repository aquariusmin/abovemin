import type { Metadata } from "next";
import PortfolioPrintContent from "@/components/portfolio/PortfolioPrintContent";

export const metadata: Metadata = {
  title: "Portfolio — Print Version",
  description: "Print-friendly summary of Sangmin Lee's portfolio case studies.",
  robots: { index: false, follow: false },
};

export default async function EnglishPortfolioPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // Curated ordering, as on /en/portfolio itself — see the Korean print page.
  return (
    <PortfolioPrintContent
      locale="en"
      mode="submission"
      route={from === "submission" ? "submission" : "normal"}
    />
  );
}
