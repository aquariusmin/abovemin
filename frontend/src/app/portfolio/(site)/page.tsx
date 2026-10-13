import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "포트폴리오",
  description:
    "부산 도시철도 체류 분석, 고객 이탈 XAI, Satellite GDP Insight를 중심으로 데이터 가정과 해석 범위를 검증하는 이상민의 데이터 분석 포트폴리오입니다.",
  alternates: {
    canonical: "/portfolio",
    languages: { ko: "/portfolio", en: "/en/portfolio", "x-default": "/portfolio" },
  },
};

// The curated `submission` reading is now the public one: three defensible
// projects first, the rest demoted to Explore. Only the PRESENTATION is
// borrowed — `route="normal"` keeps every link on `/portfolio/...`, so the
// indexed URL family is the one carrying the good version and the noindex
// `/portfolio/submission` pages stay valid for links already handed out.
export default function PortfolioPage() {
  return <PortfolioOverview locale="ko" mode="submission" route="normal" />;
}
