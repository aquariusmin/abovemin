export type EvidenceLocale = "en" | "ko";
export type LocalizedText = Record<EvidenceLocale, string>;
export type EvidenceStatus = "verified" | "reported" | "pending";

export const evidenceStatusLabels: Record<EvidenceStatus, LocalizedText> = {
  verified: { en: "Verified source", ko: "원자료 확인" },
  reported: { en: "Reported evidence", ko: "보고서 근거" },
  pending: { en: "Pending verification", ko: "추가 검증 필요" },
};

export const portfolioEvidenceOverview = [
  {
    slug: "telecom-churn",
    title: "Telecom Customer Churn Analysis",
    status: "verified" as const,
    summary: {
      en: "Contract and tenure patterns are derived directly from the 7,043-row workbook; model and SHAP exports remain pending.",
      ko: "계약 유형과 이용 기간 패턴은 7,043행 원자료에서 직접 계산했으며, 모형·SHAP 결과는 재현 후 추가합니다.",
    },
  },
  {
    slug: "satellite-gdp",
    title: "Satellite Night-Light GDP Analysis",
    status: "reported" as const,
    summary: {
      en: "The data pipeline and SPSS-reported R-squared are documented; the transformed scatter dataset is not yet reproducible.",
      ko: "데이터 흐름과 SPSS의 R² 보고값은 확인했지만, 변환된 산점도 데이터는 아직 재현되지 않았습니다.",
    },
  },
  {
    slug: "korean-air",
    title: "Korean Air Financial Analysis",
    status: "reported" as const,
    summary: {
      en: "Profitability trends and valuation-method divergence come from the report; workbook arithmetic still requires audit.",
      ko: "수익성 추이와 평가방법 간 차이는 보고서 근거이며, 가치평가 계산은 작업 파일 감사가 필요합니다.",
    },
  },
  {
    slug: "quant-trading-fleet",
    title: "Quant Trading Fleet",
    status: "verified" as const,
    summary: {
      en: "Architecture and operating controls are supported by the codebase; performance screenshots and claims are excluded.",
      ko: "구조와 운영 제어는 코드로 확인했으며, 성과 화면과 수익 관련 주장은 제외했습니다.",
    },
  },
  {
    slug: "financial-ai-model-study",
    title: "Financial AI Model Study",
    status: "reported" as const,
    summary: {
      en: "Compact panels reproduce classroom-report outputs, not production or live-model performance.",
      ko: "수업 보고서에 기록된 결과만 요약하며 실제 운영 모형의 성과로 해석하지 않습니다.",
    },
  },
  {
    slug: "phorage",
    title: "Phorage Brand and Commerce MVP",
    status: "verified" as const,
    summary: {
      en: "The customer and operator flows follow implemented routes; product photography remains pending public-safe export.",
      ko: "고객·운영 흐름은 구현된 경로를 따르며, 제품 사진은 공개 가능한 원본 확인 후 추가합니다.",
    },
  },
  {
    slug: "blood-type-survey",
    title: "Blood Type and Personality Survey Study",
    status: "verified" as const,
    summary: {
      en: "Observed, expected, and chi-square values come from the 101-response workbook; p-value reporting remains pending.",
      ko: "관측·기대빈도와 카이제곱 값은 101명 응답 workbook에서 확인했으며 p-value 보고는 보완이 필요합니다.",
    },
  },
];

export const portfolioEvidenceHighlights = [
  {
    evidence: { en: "7,043 telecom customer records", ko: "통신 고객 데이터 7,043건" },
    demonstrates: {
      en: "Customer segmentation, explainable classification, and action-oriented retention planning.",
      ko: "고객 세분화, 설명 가능한 분류모형, 분석 기반 고객 유지 전략 수립 역량을 보여줍니다.",
    },
    caution: {
      en: "The 5.0 percentage-point churn reduction is a proposed target, not an achieved result.",
      ko: "이탈률 5.0%p 감소는 실제 성과가 아니라 분석을 바탕으로 제안한 목표입니다.",
    },
  },
  {
    evidence: { en: "R-squared = 0.819", ko: "R² = 0.819" },
    demonstrates: {
      en: "Economic research using satellite data, public indicators, and regression analysis.",
      ko: "위성 데이터와 공공 지표를 결합한 경제 연구 및 회귀분석 역량을 보여줍니다.",
    },
    caution: {
      en: "This is explanatory fit in the reported simple model, not prediction accuracy or causal proof.",
      ko: "보고된 단순 회귀모형의 설명력이며, 예측 정확도나 인과관계를 뜻하지 않습니다.",
    },
  },
  {
    evidence: { en: "2020–2024 financial-ratio review", ko: "2020–2024 재무비율 분석" },
    demonstrates: {
      en: "Financial statement analysis and comparison of DCF, APV, and relative valuation.",
      ko: "재무제표 분석과 DCF·APV·상대가치평가를 비교하는 기업분석 역량을 보여줍니다.",
    },
    caution: {
      en: "A conditional classroom analysis; valuation arithmetic requires audit before public use.",
      ko: "수업·보고서 목적의 조건부 분석이며, 공개 활용 전 가치평가 산식 검토가 필요합니다.",
    },
  },
  {
    evidence: { en: "Live-server paper-trading architecture", ko: "라이브 서버 모의투자 아키텍처" },
    demonstrates: {
      en: "Broker abstraction, bot control, dashboards, logging, and operational validation.",
      ko: "브로커 추상화, 봇 제어, 대시보드, 로그, 운영 검증을 아우르는 핀테크 시스템 설계 역량을 보여줍니다.",
    },
    caution: {
      en: "Paper-trading validation only; no real-money operation or performance claim.",
      ko: "모의투자 검증 단계이며, 실거래 운용이나 수익 성과를 주장하지 않습니다.",
    },
  },
];

export const portfolioCardChips: Record<string, LocalizedText[]> = {
  "telecom-churn": [
    { en: "7,043 records", ko: "7,043건" },
    { en: "Contract & tenure EDA", ko: "계약·이용기간 EDA" },
    { en: "7 models compared", ko: "7개 모형 비교" },
  ],
  "satellite-gdp": [
    { en: "973 raw rows", ko: "원자료 973행" },
    { en: "820 merged observations", ko: "병합 관측치 820개" },
    { en: "Reported R² 0.819", ko: "보고된 R² 0.819" },
  ],
  "korean-air": [
    { en: "2020–2024 ratios", ko: "2020–2024 재무비율" },
    { en: "DCF · APV · Multiples", ko: "DCF · APV · 멀티플" },
    { en: "WACC ≈ 2.8%", ko: "WACC 약 2.8%" },
  ],
  "quant-trading-fleet": [
    { en: "Paper trading", ko: "모의투자" },
    { en: "Broker abstraction", ko: "브로커 추상화" },
    { en: "Dashboard & logs", ko: "대시보드·로그" },
  ],
  "financial-ai-model-study": [
    { en: "4 assignments", ko: "4개 과제" },
    { en: "PCA · SVR", ko: "PCA · SVR" },
    { en: "ANN · DNN", ko: "ANN · DNN" },
  ],
  phorage: [
    { en: "Pre-launch MVP", ko: "출시 전 MVP" },
    { en: "Physical goods", ko: "실물 굿즈 제작" },
    { en: "Commerce workflow", ko: "커머스 흐름 설계" },
  ],
  "blood-type-survey": [
    { en: "101 responses", ko: "응답 101건" },
    { en: "Chi-square tests", ko: "카이제곱 검정" },
    { en: "Observed vs expected", ko: "관측·기대빈도 비교" },
  ],
};

export const churnContractRates = [
  { label: { en: "Month-to-month", ko: "월 단위" }, value: 42.71 },
  { label: { en: "One year", ko: "1년" }, value: 11.27 },
  { label: { en: "Two year", ko: "2년" }, value: 2.83 },
];

export const churnTenureRates = [
  { label: "0–12", value: 47.44, count: 2186 },
  { label: "13–24", value: 28.71, count: 1024 },
  { label: "25–48", value: 20.39, count: 1594 },
  { label: "49–72", value: 9.51, count: 2239 },
];

export const koreanAirProfitability = [
  { year: "2020", netMargin: -3.0, roe: -6.9, roa: -0.9 },
  { year: "2021", netMargin: 6.4, roe: 8.4, roa: 2.2 },
  { year: "2022", netMargin: 12.3, roe: 18.6, roa: 5.96 },
  { year: "2023", netMargin: 7.0, roe: 11.5, roa: 3.5 },
  { year: "2024", netMargin: 7.7, roe: 12.6, roa: 3.17 },
];

export const polynomialValidationRmse = [
  { label: "Degree 1", value: 44166.51161 },
  { label: "Degree 2", value: 29606.84494 },
  { label: "Degree 3", value: 27121.76099 },
  { label: "Degree 4", value: 26113.81122 },
  { label: "Degree 5", value: 24594.34247 },
];

export const pcaVariance = [
  { label: "PC1", value: 64.03 },
  { label: "PC2", value: 24.37 },
  { label: "PC3", value: 9.77 },
  { label: "PC4", value: 1.83 },
];

export const surveyChiSquare = [
  { dimension: "E / I", statistic: 2.6659, minimumExpected: 4.356 },
  { dimension: "T / F", statistic: 8.1474, minimumExpected: 4.95 },
  { dimension: "N / S", statistic: 1.5754, minimumExpected: 4.752 },
  { dimension: "P / J", statistic: 3.2498, minimumExpected: 4.158 },
];

export const surveyTfFrequencies = [
  { bloodType: "A", observedT: 12, expectedT: 18.178, observedF: 24, expectedF: 17.822 },
  { bloodType: "B", observedT: 16, expectedT: 14.644, observedF: 13, expectedF: 14.356 },
  { bloodType: "O", observedT: 18, expectedT: 13.129, observedF: 8, expectedF: 12.871 },
  { bloodType: "AB", observedT: 5, expectedT: 5.05, observedF: 5, expectedF: 4.95 },
];
