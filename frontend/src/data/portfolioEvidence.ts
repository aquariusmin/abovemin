export type EvidenceLocale = "en" | "ko";
export type LocalizedText = Record<EvidenceLocale, string>;
export type EvidenceStatus = "verified" | "reported";

export const evidenceStatusLabels: Record<EvidenceStatus, LocalizedText> = {
  verified: { en: "Verified source", ko: "원자료 확인" },
  reported: { en: "Reported evidence", ko: "보고서 근거" },
};

export const portfolioEvidenceOverview = [
  {
    slug: "arctic-route",
    title: "Arctic Route Accessibility Analysis",
    status: "verified" as const,
    summary: {
      en: "Navigable-season and trend figures are recomputed from the project's own output tables, which are pinned to a SHA-256 data manifest.",
      ko: "통항 가능 기간과 추세 수치는 SHA-256 매니페스트로 고정된 산출 테이블에서 다시 계산했습니다.",
    },
  },
  {
    slug: "busan-station-dwell",
    title: "Busan Station Dwell Conversion Analysis",
    status: "verified" as const,
    summary: {
      en: "Dwell times and station typology are recomputed from the processed KPI table; the study itself is still in progress.",
      ko: "체류시간과 역 유형 분류는 처리된 KPI 테이블에서 다시 계산했으며, 연구 자체는 아직 진행 중입니다.",
    },
  },
  {
    slug: "telecom-churn",
    title: "Telecom Customer Churn Analysis",
    status: "verified" as const,
    summary: {
      en: "Contract and tenure patterns are derived directly from the 7,043-row CSV; model scores are kept as reported text.",
      ko: "계약 유형과 이용 기간 패턴은 7,043행 원자료에서 직접 계산했고, 모형 수치는 보고값으로만 다룹니다.",
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
    title: "Quant Trading Automation",
    status: "reported" as const,
    summary: {
      en: "Architecture and operating controls are supported by the codebase; backtest figures are quoted from the project's own walk-forward output, not re-run here.",
      ko: "구조와 운영 제어는 코드로 확인했고, 백테스트 수치는 프로젝트의 walk-forward 산출값을 인용한 것으로 이 페이지에서 다시 실행하지는 않았습니다.",
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
      en: "The customer and operator flows follow implemented routes and are presented as a pre-launch MVP.",
      ko: "고객·운영 흐름은 구현된 경로를 기준으로 정리했고, 공개 출시 전 MVP로만 표현합니다.",
    },
  },
  {
    slug: "blood-type-survey",
    title: "Blood Type and Personality Survey Study",
    status: "verified" as const,
    summary: {
      en: "Observed, expected, and chi-square values come from the 101-response workbook, with scope kept narrow.",
      ko: "관측·기대빈도와 카이제곱 값은 101명 응답 데이터에서 확인했고, 결론의 범위는 좁게 잡았습니다.",
    },
  },
];

export const portfolioEvidenceHighlights = [
  {
    evidence: { en: "0 → 3.4 navigable months a year", ko: "연 통항 가능 0개월 → 3.4개월" },
    demonstrates: {
      en: "Turning satellite climate grids into a decision-grade operating window, with OLS and Theil-Sen required to agree.",
      ko: "위성 기후 격자를 운항 판단 단위로 옮기고, OLS와 Theil-Sen이 일치할 때만 추세를 보고하는 검증 규칙을 적용했습니다.",
    },
    caution: {
      en: "Physical accessibility under concentration thresholds only; it excludes insurance, escort, and regulatory constraints.",
      ko: "해빙농도 임계값 기준의 물리적 접근성이며, 보험·쇄빙선 지원·규제 제약은 포함하지 않습니다.",
    },
  },
  {
    evidence: { en: "0.96 h dwell at Haeundae", ko: "해운대역 체류 0.96시간" },
    demonstrates: {
      en: "Constructing a variable the source data does not contain, finding the first metric broken, and repairing it before reporting.",
      ko: "원자료에 없는 변수를 만들고, 첫 지표가 깨진 것을 확인한 뒤 보정하고 나서 보고하는 과정입니다.",
    },
    caution: {
      en: "In-progress work ahead of a September 2026 submission; dwell is estimated from gate records, not measured mobility data.",
      ko: "2026년 9월 제출을 앞둔 진행 중 과제이며, 체류는 개찰 기록에서 추정한 값입니다.",
    },
  },
  {
    evidence: { en: "7,043 telecom customer records", ko: "통신 고객 데이터 7,043건" },
    demonstrates: {
      en: "Customer segmentation, explainable classification, and action-oriented retention planning.",
      ko: "고객 세분화, 설명 가능한 분류모형, 분석 기반 고객 유지 전략 수립까지 이어지는 과정입니다.",
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
    evidence: { en: "Walk-forward out-of-sample validation", ko: "walk-forward 아웃오브샘플 검증" },
    demonstrates: {
      en: "Broker abstraction and operating controls, plus a refusal to report in-sample performance.",
      ko: "브로커 추상화와 운영 제어, 그리고 인샘플 성과를 보고하지 않겠다는 검증 규칙을 함께 보여줍니다.",
    },
    caution: {
      en: "Paper-trading validation only; backtests are historical simulations, not a real-money record.",
      ko: "페이퍼 트레이딩 검증 단계이며, 백테스트는 과거 데이터 시뮬레이션이지 실거래 기록이 아닙니다.",
    },
  },
];

export const portfolioCardChips: Record<string, LocalizedText[]> = {
  "arctic-route": [
    { en: "1979–2025 grids", ko: "1979–2025 격자" },
    { en: "OLS + Theil-Sen", ko: "OLS + Theil-Sen" },
    { en: "3,151 nm saved", ko: "3,151해리 절감" },
  ],
  "busan-station-dwell": [
    { en: "40,544 rows", ko: "40,544행" },
    { en: "112 stations", ko: "112개 역" },
    { en: "Little's Law", ko: "Little's Law" },
  ],
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
    { en: "DCF · APV · Multiples", ko: "DCF · APV · 멀티플" },
    { en: "WACC ≈ 2.8%", ko: "WACC 약 2.8%" },
  ],
  "quant-trading-fleet": [
    { en: "Walk-forward OOS", ko: "walk-forward 검증" },
    { en: "Measured costs", ko: "실측 비용 반영" },
    { en: "Paper trading", ko: "페이퍼 트레이딩" },
  ],
  "financial-ai-model-study": [
    { en: "4 assignments", ko: "4개 과제" },
    { en: "PCA · SVR", ko: "PCA · SVR" },
    { en: "ANN · DNN", ko: "ANN · DNN" },
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

// Decade means recomputed from outputs/tables/nsr_annual_navigability.csv (ice-1A/PC7, Jun-Nov sampling).
export const arcticNavigableMonths = [
  { label: { en: "1980s", ko: "1980년대" }, value: 0.0, years: 11 },
  { label: { en: "1990s", ko: "1990년대" }, value: 0.9, years: 10 },
  { label: { en: "2000s", ko: "2000년대" }, value: 1.6, years: 10 },
  { label: { en: "2010s", ko: "2010년대" }, value: 3.2, years: 10 },
  { label: { en: "2020-2025", ko: "2020-2025" }, value: 3.17, years: 6 },
];

// Mean dwell hours for inflow-type stations, recomputed from data/processed/station_kpi.csv.
export const busanInflowDwell = [
  { label: { en: "Haeundae", ko: "해운대역" }, value: 0.96 },
  { label: { en: "Namcheon", ko: "남천역" }, value: 1.21 },
  { label: { en: "Geumnyeonsan", ko: "금련산역" }, value: 1.22 },
  { label: { en: "Dongnae (Line 4)", ko: "동래역(4호선)" }, value: 1.27 },
  { label: { en: "Inflow-type median", ko: "유입형 49개 역 중앙값" }, value: 2.09 },
];

// Sunday checkout index = 10-13h boardings divided by 07-10h boardings, same source table.
export const busanCheckoutIndex = [
  { label: { en: "Busan (KTX)", ko: "부산역 (KTX)" }, value: 2.779 },
  { label: { en: "Haeundae", ko: "해운대역" }, value: 2.715 },
  { label: { en: "Jagalchi", ko: "자갈치역" }, value: 2.482 },
  { label: { en: "Deokcheon (Line 2)", ko: "덕천역(2호선)" }, value: 2.366 },
  { label: { en: "Seomyeon (Line 2)", ko: "서면역(2호선)" }, value: 2.365 },
];

// Quoted from the tqt project README walk-forward table (five-year train, two-year test).
export const tqtWalkForward = [
  { strategy: { en: "Faber", ko: "Faber" }, inSample: 5.73, outOfSample: 7.36, sharpe: 1.01, maxDrawdown: -14.1, decay: 1.28 },
  { strategy: { en: "Dual momentum", ko: "듀얼 모멘텀" }, inSample: 7.60, outOfSample: 7.57, sharpe: 0.49, maxDrawdown: -30.5, decay: 1.00 },
  { strategy: { en: "Buy and hold", ko: "매수보유" }, inSample: 8.94, outOfSample: 11.10, sharpe: 0.97, maxDrawdown: -20.1, decay: 1.24 },
];

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
