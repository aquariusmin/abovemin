import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "데이터 분석 포트폴리오",
  description: "부산 도시철도 체류 분석, 고객 이탈 XAI, Satellite GDP Insight를 중심으로 데이터 가정과 해석 범위를 검증하는 이상민의 데이터 분석 포트폴리오입니다.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/portfolio/submission" },
};

export default function PortfolioSubmissionPage() {
  return <PortfolioOverview locale="ko" mode="submission" />;
}
