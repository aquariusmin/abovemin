import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "포트폴리오 — 제출용",
  description: "이상민의 포트폴리오와 일곱 개의 근거 중심 프로젝트를 보여주는 제출용 화면입니다.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/ko/portfolio" },
};

export default function KoreanPortfolioSubmissionPage() {
  return <PortfolioOverview locale="ko" mode="submission" />;
}
