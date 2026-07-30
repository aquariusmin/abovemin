import type { PortfolioLocale } from "@/data/portfolioRouting";

export type PortfolioCapability = {
  title: string;
  body: string;
};

// Shared by the web overview and the print/PDF summary so the two never drift apart.
export const portfolioCapabilities: Record<PortfolioLocale, PortfolioCapability[]> = {
  en: [
    { title: "Markets", body: "International trade, macro context, alternative data, and country or industry screening." },
    { title: "Finance", body: "Financial statements, valuation logic, sensitivity checks, and assumption audits." },
    { title: "Analytics", body: "Python, statistics, regression, classification, explainable AI, and survey analysis." },
    { title: "Execution", body: "Dashboards, reports, MVP flows, operating checks, and clear next-step recommendations." },
  ],
  ko: [
    { title: "시장", body: "국제무역, 거시경제 맥락, 대체 데이터, 국가·산업 스크리닝을 연결합니다." },
    { title: "재무", body: "재무제표, 가치평가 논리, 민감도, 가정 점검에 관심을 두고 봅니다." },
    { title: "분석", body: "Python, 통계, 회귀, 분류, 설명 가능한 AI와 설문 분석을 활용합니다." },
    { title: "실행", body: "대시보드, 보고서, MVP 흐름, 운영 점검과 다음 액션까지 정리합니다." },
  ],
};
