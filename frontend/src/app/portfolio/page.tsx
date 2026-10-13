import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";
import { PORTFOLIO_CARD, sectionTitle, shareCard } from "@/lib/share-card";

const TITLE = "포트폴리오";
const DESCRIPTION =
  "부산 도시철도 체류 분석, 고객 이탈 XAI, Satellite GDP Insight를 중심으로 데이터 가정과 해석 범위를 검증하는 이상민의 데이터 분석 포트폴리오입니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/portfolio",
    languages: { ko: "/portfolio", en: "/en/portfolio", "x-default": "/portfolio" },
  },
  // Without its own block the card inherits the root's title and description
  // (shallow merge — see `shareCard`), so a link handed to a recruiter previews
  // as the photo studio.
  ...shareCard({
    title: sectionTitle(TITLE),
    description: DESCRIPTION,
    path: "/portfolio",
    images: [PORTFOLIO_CARD],
  }),
};

// The curated `submission` reading is now the public one: three defensible
// projects first, the rest demoted to Explore. Only the PRESENTATION is
// borrowed — `route="normal"` keeps every link on `/portfolio/...`, so the
// indexed URL family is the one carrying the good version and the noindex
// `/portfolio/submission` pages stay valid for links already handed out.
export default function PortfolioPage() {
  return <PortfolioOverview locale="ko" mode="submission" route="normal" />;
}
