import type { Metadata } from "next";
import PortfolioOverview from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "포트폴리오",
  description: "경제·경영 지식과 데이터 분석을 바탕으로 비즈니스 문제를 구조화하고 실무적 인사이트로 연결하는 이상민의 포트폴리오입니다.",
  alternates: {
    canonical: "/portfolio",
    languages: { ko: "/portfolio", en: "/en/portfolio", "x-default": "/portfolio" },
  },
};

export default function PortfolioPage() {
  return <PortfolioOverview locale="ko" />;
}
