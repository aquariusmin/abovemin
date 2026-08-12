import type { Metadata } from "next";
import PortfolioPrintContent from "@/components/portfolio/PortfolioPrintContent";

export const metadata: Metadata = {
  title: "Portfolio — Print Version",
  description: "Print-friendly summary of Sangmin Lee's seven portfolio case studies.",
  robots: { index: false, follow: false },
};

export default async function EnglishPortfolioPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <PortfolioPrintContent locale="en" mode={from === "submission" ? "submission" : "normal"} />;
}
