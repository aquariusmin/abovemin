import type { Metadata } from "next";
import PortfolioPrintContent from "@/components/portfolio/PortfolioPrintContent";

export const metadata: Metadata = {
  title: "Portfolio — Print Version",
  description: "Print-friendly summary of Sangmin Lee's seven portfolio case studies.",
  robots: { index: false, follow: false },
};

export default function PortfolioPrintPage() {
  return <PortfolioPrintContent locale="en" />;
}
