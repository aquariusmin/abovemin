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
    { title: "시장", body: "국제무역과 거시경제를 공부하며 국가·산업별 자료와 대체 경제지표를 살펴봤습니다." },
    { title: "재무", body: "재무제표를 읽고, 가치평가에 사용한 가정에 따라 결과가 얼마나 달라지는지 비교합니다." },
    { title: "분석", body: "Python으로 데이터를 정리하고 회귀·분류모형, SHAP, 설문 통계 등을 활용해 분석합니다." },
    { title: "실행", body: "분석 결과를 보고서와 대시보드로 정리하고, 직접 서비스를 만들어 사용 과정을 확인합니다." },
  ],
};
