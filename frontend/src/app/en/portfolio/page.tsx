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
  // Same reason as `/portfolio`; `en_US` because the root's `ko_KR` would
  // otherwise label an English page as Korean. The image is the portfolio card:
  // `app/portfolio/opengraph-image` does not reach `/en/...`, so this page was
  // previewing with the photo studio's card.
  ...shareCard({
    title: sectionTitle(TITLE),
    description: DESCRIPTION,
    path: "/en/portfolio",
    locale: "en_US",
    images: [PORTFOLIO_CARD_EN],
  }),
};

// Same curated reading as `/portfolio` — three featured projects, the rest in
// Explore — so the two halves of the hreflang pair show the same page.
export default function EnglishPortfolioPage() {
  return <PortfolioOverview locale="en" route="normal" />;
}
