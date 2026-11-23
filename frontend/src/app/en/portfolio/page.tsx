import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";
import { PORTFOLIO_CARD_EN, sectionTitle, shareCard } from "@/lib/share-card";

const TITLE = "Portfolio · English";
const DESCRIPTION =
  "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/en/portfolio",
    languages: { ko: "/portfolio", en: "/en/portfolio", "x-default": "/portfolio" },
  },
  // Own openGraph block: `en_US` locale, and the root's portfolio opengraph-image doesn't reach /en.
  ...shareCard({
    title: sectionTitle(TITLE),
    description: DESCRIPTION,
    path: "/en/portfolio",
    locale: "en_US",
    images: [PORTFOLIO_CARD_EN],
  }),
};

export default function EnglishPortfolioPage() {
  return <PortfolioOverview locale="en" route="normal" />;
}
