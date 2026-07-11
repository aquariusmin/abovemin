import EvidenceFigure, { PendingEvidence } from "@/components/portfolio/EvidenceFigure";
import {
  churnContractRates,
  churnTenureRates,
  koreanAirProfitability,
  pcaVariance,
  polynomialValidationRmse,
  surveyChiSquare,
  surveyTfFrequencies,
  type EvidenceLocale,
} from "@/data/portfolioEvidence";

export default function ProjectEvidence({
  slug,
  locale,
}: {
  slug: string;
  locale: EvidenceLocale;
}) {
  switch (slug) {
    case "telecom-churn":
      return <ChurnEvidence locale={locale} />;
    case "satellite-gdp":
      return <GdpEvidence locale={locale} />;
    case "korean-air":
      return <KoreanAirEvidence locale={locale} />;
    case "quant-trading-fleet":
      return <QuantEvidence locale={locale} />;
    case "financial-ai-model-study":
      return <FinancialAiEvidence locale={locale} />;
    case "phorage":
      return <PhorageEvidence locale={locale} />;
    case "blood-type-survey":
      return <SurveyEvidence locale={locale} />;
    default:
      return null;
  }
}

function ChurnEvidence({ locale }: { locale: EvidenceLocale }) {
  const contractItems = churnContractRates.map((item) => ({
    label: item.label[locale],
    value: item.value,
  }));
  const tenureItems = churnTenureRates.map((item) => ({
    label: `${item.label} ${locale === "ko" ? "개월" : "months"}`,
    value: item.value,
    detail: `n=${item.count.toLocaleString("en-US")}`,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceFigure
          locale={locale}
          status="verified"
          title={locale === "ko" ? "계약 유형별 이탈률" : "Churn rate by contract type"}
          source="WA_Fn-UseC_-Telco-Customer-Churn.xlsx · 7,043 rows"
          caption={
            locale === "ko"
              ? "원자료에서 직접 계산한 기술통계입니다. 월 단위 계약과 이탈의 연관성을 보여주지만, 특정 유지 전략이 이탈률을 낮췄다는 인과적 성과를 뜻하지 않습니다."
              : "Calculated directly from the source workbook. The bars show a descriptive association between contract type and churn; they do not show that an intervention reduced churn."
          }
        >
          <HorizontalBars items={contractItems} valueSuffix="%" />
        </EvidenceFigure>

        <EvidenceFigure
          locale={locale}
          status="verified"
          title={locale === "ko" ? "이용 기간 구간별 이탈률" : "Churn rate by tenure group"}
          source="WA_Fn-UseC_-Telco-Customer-Churn.xlsx · bins computed from tenure"
          caption={
            locale === "ko"
              ? "원자료의 tenure를 0–12, 13–24, 25–48, 49–72개월로 구분해 계산했습니다. 가입 초기의 높은 이탈 비중을 보여주지만, 고객별 원인이나 제안 전략의 실제 효과를 증명하지는 않습니다."
              : "Tenure was grouped into four intervals directly from the workbook. The chart describes higher churn among newer customers; it does not identify individual causation or validate a proposed retention action."
          }
        >
          <HorizontalBars items={tenureItems} valueSuffix="%" />
        </EvidenceFigure>
      </div>

      <EvidenceFigure
        locale={locale}
        status="pending"
        title={locale === "ko" ? "모형 성능·SHAP 근거" : "Model metrics and SHAP evidence"}
        caption={
          locale === "ko"
            ? "기존 보고서에는 ROC와 SHAP 이미지가 있지만, 최종 모형·분할·전처리 파이프라인을 한 번에 재현한 export가 아닙니다. 따라서 약 0.842의 ROC-AUC와 설명 결과는 텍스트상 보고값으로만 유지하며 시각 자료로 확정하지 않습니다."
            : "ROC and SHAP images exist in the report, but they are not yet tied to one reproducible final pipeline, split, and model export. The approximately 0.842 ROC-AUC remains a reported value rather than a verified chart."
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <PendingEvidence
            label={locale === "ko" ? "지표표 추가 예정" : "Metrics table pending"}
            detail={locale === "ko" ? "최종 파이프라인 재실행 후 ROC-AUC·precision·recall·F1 표를 추가합니다." : "Add ROC-AUC, precision, recall, and F1 only after rerunning the final pipeline."}
          />
          <PendingEvidence
            label={locale === "ko" ? "SHAP export 추가 예정" : "SHAP export pending"}
            detail={locale === "ko" ? "최종 Gradient Boosting 모형과 일치하는 SHAP 결과를 확인한 뒤 추가합니다." : "Add only a SHAP export confirmed to match the final Gradient Boosting model."}
          />
        </div>
      </EvidenceFigure>
    </div>
  );
}

function GdpEvidence({ locale }: { locale: EvidenceLocale }) {
  const pipeline = locale === "ko"
    ? ["VIIRS 야간조도", "World Bank 지표", "국가·연도 데이터", "회귀분석"]
    : ["VIIRS night lights", "World Bank indicators", "Country-year data", "Regression analysis"];

  return (
    <div className="space-y-5">
      <EvidenceFigure
        locale={locale}
        status="verified"
        title={locale === "ko" ? "대체 데이터 분석 흐름" : "Alternative-data pipeline"}
        source="GDP project report, PPTX, XLSX, and SPSS output"
        caption={
          locale === "ko"
            ? "위성 밝기와 경제지표가 국가·연도 단위 분석으로 연결되는 과정을 보여줍니다. 이 흐름도는 데이터 출처와 처리 단계를 설명할 뿐, 조도가 GDP의 원인이라는 뜻은 아닙니다."
            : "The diagram shows how satellite and economic indicators enter a country-year analysis. It explains provenance and process; it does not establish that night lights cause GDP."
        }
      >
        <FlowDiagram items={pipeline} />
      </EvidenceFigure>

      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "SPSS 보고 모형 적합도" : "SPSS-reported model fit"}
          source="SPSS model summary embedded in the GDP presentation"
          caption={
            locale === "ko"
              ? "보고된 단순 회귀모형에서 R² = 0.819였습니다. 이는 표본 내 GDP 변동의 81.9%를 설명했다는 뜻이며, 81.9%의 예측 정확도나 인과효과를 의미하지 않습니다."
              : "The reported simple model has R-squared = 0.819. This is explanatory fit within the reported sample, not 81.9% prediction accuracy and not causal evidence."
          }
        >
          <div className="grid min-h-44 place-items-center border border-accent/15 bg-accent/[0.035] text-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate">Reported R-squared</p>
              <p className="mt-3 text-6xl font-bold tracking-tight text-accent">0.819</p>
              <p className="mt-3 font-sans text-xs text-slate">N = 791 in the reported simple-model output</p>
            </div>
          </div>
        </EvidenceFigure>

        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "서로 다른 데이터 단계" : "Distinct dataset stages"}
          source="Project XLSX and HWPX methodology section"
          caption={
            locale === "ko"
              ? "973, 820, 791은 각각 원자료, 병합 관측치, GDP 사용 가능 관측치를 뜻합니다. 서로 다른 처리 단계이므로 동일한 표본 크기처럼 바꾸어 사용할 수 없습니다."
              : "973, 820, and 791 refer to raw rows, merged observations, and GDP-usable observations. They are different processing stages and must not be treated as interchangeable sample sizes."
          }
        >
          <div className="grid gap-px bg-black/5 sm:grid-cols-3">
            {[
              ["973", locale === "ko" ? "원자료 행" : "Raw rows"],
              ["820", locale === "ko" ? "병합 관측치" : "Merged observations"],
              ["791", locale === "ko" ? "GDP 관측치" : "GDP observations"],
            ].map(([value, label]) => (
              <div key={value} className="bg-white/80 p-6 text-center">
                <p className="text-4xl font-bold text-accent">{value}</p>
                <p className="mt-2 break-keep font-sans text-xs text-slate">{label}</p>
              </div>
            ))}
          </div>
        </EvidenceFigure>
      </div>

      <EvidenceFigure
        locale={locale}
        status="pending"
        title={locale === "ko" ? "로그 조도–로그 GDP 산점도" : "Log night-light versus log GDP scatterplot"}
        caption={
          locale === "ko"
            ? "보고서는 로그 변환된 중앙값 조도를 설명하지만 현재 XLSX에는 brightness_sum이 포함되어 있어 단순 재실행으로 R² = 0.819가 재현되지 않습니다. 정확한 변환·필터 데이터가 export되기 전에는 산점도나 회귀선을 게시하지 않습니다."
            : "The report describes log-transformed median brightness, while the available workbook contains brightness_sum and does not reproduce R-squared = 0.819 through a direct rerun. No scatter or regression line is published until the transformed dataset is exported."
        }
      >
        <PendingEvidence
          label={locale === "ko" ? "검증된 데이터 export 후 추가" : "Chart to add after verified data export"}
          detail={locale === "ko" ? "분석에 사용한 밝기 정의, 제외 기준, 로그 변환과 최종 791개 관측치를 하나의 재현 가능한 파일로 정리해야 합니다." : "The brightness definition, exclusions, transformations, and final 791 observations must be reconciled in one reproducible export."}
        />
      </EvidenceFigure>
    </div>
  );
}

function KoreanAirEvidence({ locale }: { locale: EvidenceLocale }) {
  return (
    <div className="space-y-5">
      <EvidenceFigure
        locale={locale}
        status="reported"
        title={locale === "ko" ? "2020–2024 수익성 지표 추이" : "2020–2024 profitability trends"}
        source="Korean Air Financial Analysis report · profitability table"
        caption={
          locale === "ko"
            ? "보고서의 순이익률, ROE, ROA 표를 그대로 옮긴 추이입니다. 팬데믹 이후 회복과 변동을 보여주지만, 계산식과 원자료가 별도 workbook으로 감사된 결과는 아니며 투자 판단을 제공하지 않습니다."
            : "The lines reproduce net margin, ROE, and ROA values reported in the classroom report. They show the reported recovery and variation, but the underlying workbook has not been audited and the chart is not investment advice."
        }
      >
        <ProfitabilityTrend />
      </EvidenceFigure>

      <EvidenceFigure
        locale={locale}
        status="reported"
        title={locale === "ko" ? "가치평가 방법별 해석 차이" : "Valuation-method divergence"}
        source="Korean Air Financial Analysis report · DCF, APV, and multiples sections"
        caption={
          locale === "ko"
            ? "보고서에서 DCF와 APV는 음의 FCF 가정으로 불안정하거나 음수 결과를 보인 반면, multiples는 더 긍정적인 상대가치를 제시했습니다. 이는 방법 간 충돌을 보여줄 뿐 특정 목표가격이나 매매 판단을 검증하지 않습니다."
            : "In the report, negative FCF assumptions made DCF and APV unstable or negative, while multiples produced a more positive relative view. The panel shows method conflict; it does not validate a target price or investment action."
        }
      >
        <div className="grid gap-px bg-black/5 md:grid-cols-3">
          {[
            ["DCF", locale === "ko" ? "FCF 가정에 매우 민감 · 음수/불안정" : "Highly sensitive to FCF · negative/unstable"],
            ["APV", locale === "ko" ? "영업 기반 손실이 절세효과를 압도" : "Operating-base weakness outweighed tax shield"],
            ["Multiples", locale === "ko" ? "상대적으로 더 긍정적인 시장 비교" : "More positive relative market comparison"],
          ].map(([method, interpretation]) => (
            <div key={method} className="min-h-40 bg-white/80 p-6">
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-accent">{method}</p>
              <p className="mt-5 break-keep font-sans text-sm leading-relaxed text-slate">{interpretation}</p>
            </div>
          ))}
        </div>
      </EvidenceFigure>

      <EvidenceFigure
        locale={locale}
        status="pending"
        title={locale === "ko" ? "민감도·목표가격 계산" : "Sensitivity and target-price arithmetic"}
        caption={
          locale === "ko"
            ? "보고서에는 숫자표가 있지만 가치평가 workbook, 수식, 비교기업 구성, 단위와 기준일이 공개 전 감사되지 않았습니다. 따라서 숫자표와 KRW 80,000 수준을 시각적 결론으로 사용하지 않습니다."
            : "Numeric tables exist in the report, but the valuation workbook, formulas, peer set, units, and dates have not been audited for public use. Numeric sensitivity and the conditional KRW 80,000 classroom reference are not presented as visual conclusions."
        }
      >
        <PendingEvidence
          label={locale === "ko" ? "가치평가 감사 후 추가" : "Pending valuation audit"}
          detail={locale === "ko" ? "DCF·APV·multiples 입력값과 산식을 재구성해 검증한 뒤에만 민감도 표를 공개합니다." : "Publish a sensitivity table only after rebuilding and checking the DCF, APV, and multiples inputs and formulas."}
        />
      </EvidenceFigure>
    </div>
  );
}

function QuantEvidence({ locale }: { locale: EvidenceLocale }) {
  const architecture = locale === "ko"
    ? ["전략 봇", "KIS·CCXT broker", "실행·상태 저장", "FastAPI 제어", "React 모니터링"]
    : ["Strategy bots", "KIS · CCXT brokers", "Execution · state store", "FastAPI controls", "React monitoring"];
  const checklist = locale === "ko"
    ? [
        ["라이브 서버 모의투자", "검증 진행 중"],
        ["봇 상태·설정 제어", "구현"],
        ["실행 이력·운영 로그", "구현"],
        ["주문 실패·대사 기준", "정의 필요"],
        ["중복 주문·재시작 기준", "정의 필요"],
        ["정식 검증 보고서", "작성 필요"],
      ]
    : [
        ["Live-server paper trading", "In validation"],
        ["Bot state and setting controls", "Implemented"],
        ["Execution history and logs", "Implemented"],
        ["Failed-order and reconciliation criteria", "Pending"],
        ["Duplicate-order and restart criteria", "Pending"],
        ["Formal validation report", "Pending"],
      ];

  return (
    <div className="space-y-5">
      <EvidenceFigure
        locale={locale}
        status="verified"
        title={locale === "ko" ? "운영 시스템 구조" : "Operating-system architecture"}
        source="Current FastAPI/React architecture and portfolio codebase"
        caption={
          locale === "ko"
            ? "전략, 브로커 추상화 계층, 실행 데이터, 제어 API와 모니터링의 연결을 보여줍니다. 구조가 구현되어 있다는 근거이며, 실거래 운영이나 수익률·승률·수익성을 증명하지 않습니다."
            : "The diagram shows the connection among strategies, broker abstraction, execution data, controls, and monitoring. It supports the implemented architecture; it does not evidence real-money operation, returns, win rate, or profitability."
        }
      >
        <FlowDiagram items={architecture} compact />
      </EvidenceFigure>

      <EvidenceFigure
        locale={locale}
        status="verified"
        title={locale === "ko" ? "모의투자 운영 검증표" : "Paper-trading operational checklist"}
        source="Implemented controls plus documented validation gaps"
        caption={
          locale === "ko"
            ? "현재 구현된 운영 기능과 아직 정의해야 할 검증 기준을 함께 표시합니다. 완료되지 않은 항목을 숨기지 않으며, 어떠한 실거래 성과도 보고하지 않습니다."
            : "The checklist separates implemented operating controls from validation criteria still to be defined. It does not report or imply any real-money performance."
        }
      >
        <Checklist rows={checklist} locale={locale} />
      </EvidenceFigure>

      <EvidenceFigure
        locale={locale}
        status="pending"
        title={locale === "ko" ? "대시보드·실행 이력 화면" : "Dashboard and execution-history screenshots"}
        caption={
          locale === "ko"
            ? "현재 화면에는 모의투자 계좌 잔고와 손익(paper equity·PnL) 필드가 있어 맥락 없이 공개하면 실거래 성과로 오해될 수 있습니다. 민감값을 가리고 모의투자 표기를 유지한 공개용 화면이 준비되기 전에는 placeholder로 둡니다."
            : "The current interface includes paper-equity and paper-PnL fields that could be misread without context. Screenshots remain pending until a redacted, explicitly paper-trading-only export is prepared."
        }
      >
        <PendingEvidence
          label={locale === "ko" ? "공개용 redacted 화면 준비 후 추가" : "Public-safe redacted screenshots pending"}
          detail={locale === "ko" ? "봇 이름·계좌 관련 값·성과 필드를 비식별화하고 모의투자 고지를 화면 안에 포함해야 합니다." : "Anonymize bot and account fields, redact performance values, and keep the paper-trading disclaimer inside the image."}
        />
      </EvidenceFigure>
    </div>
  );
}

function FinancialAiEvidence({ locale }: { locale: EvidenceLocale }) {
  const rmseItems = polynomialValidationRmse.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const varianceItems = pcaVariance.map((item) => ({
    label: item.label,
    value: item.value,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "다항회귀 차수별 validation RMSE" : "Polynomial degree and validation RMSE"}
          source="Financial AI assignment 1 report"
          caption={
            locale === "ko"
              ? "과제 보고서에 기록된 validation RMSE를 차수별로 비교합니다. 이 그래프만으로 특정 차수가 최종 선택이라고 결론 내릴 수 없으며, train/test 결과와 원자료를 함께 재현해야 합니다."
              : "The bars reproduce validation RMSE values reported in assignment 1. They do not by themselves establish a preferred final degree; training and test behavior still need a reproducible notebook."
          }
        >
          <HorizontalBars items={rmseItems} valueFormatter={(value) => Math.round(value).toLocaleString("en-US")} />
        </EvidenceFigure>

        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "PCA 설명분산" : "PCA explained variance"}
          source="Financial AI assignment 1 report · national-risk example"
          caption={
            locale === "ko"
              ? "보고서에서 PC1과 PC2가 각각 64.03%, 24.37%를 설명해 합계 약 88.4%였습니다. 특정 국가위험 예시의 수업 결과이며 일반적인 금융 예측 성능을 뜻하지 않습니다."
              : "PC1 and PC2 explain 64.03% and 24.37%, about 88.4% combined in the reported national-risk example. This is classroom evidence for that dataset, not general financial-model performance."
          }
        >
          <HorizontalBars items={varianceItems} valueSuffix="%" />
        </EvidenceFigure>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "Linear SVR tuning 결과" : "Linear SVR tuning result"}
          source="Financial AI assignment 3 report · Iowa housing example"
          caption={
            locale === "ko"
              ? "비교한 조합 중 C=1, epsilon=50이 보고서상 가장 낮은 validation MSE를 보였습니다. 제한된 수업 실험의 결과이며 외부 데이터나 production 환경의 성능을 보장하지 않습니다."
              : "Among the tested combinations, C=1 and epsilon=50 produced the lowest reported validation MSE. This is a bounded classroom experiment, not evidence of external or production performance."
          }
        >
          <MetricCards
            metrics={[
              ["C", "1.0"],
              ["epsilon", "50"],
              ["Train MSE", "1,782.2306"],
              ["Validation MSE", "1,944.5111"],
            ]}
          />
        </EvidenceFigure>

        <EvidenceFigure
          locale={locale}
          status="reported"
          title={locale === "ko" ? "ANN과 DNN validation 관찰" : "ANN and DNN validation behavior"}
          source="Financial AI assignment 4 report"
          caption={
            locale === "ko"
              ? "보고서는 더 깊은 DNN이 작은 ANN보다 의미 있는 개선을 보이지 않았다고 해석했습니다. 문서 안의 일부 최소 손실 표기가 일관되지 않아 정확한 수치 비교 대신 정성적 결론만 표시합니다."
              : "The report concludes that the deeper DNN did not deliver a meaningful improvement over the smaller ANN. Because minimum-loss figures are not fully consistent within the document, only the qualitative conclusion is shown."
          }
        >
          <div className="grid gap-px bg-black/5 sm:grid-cols-2">
            <div className="bg-white/80 p-6">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-accent">ANN</p>
              <p className="mt-4 break-keep font-sans text-sm leading-relaxed text-slate">
                {locale === "ko" ? "은닉층 1개 · 비교 기준 모형" : "One hidden layer · comparison baseline"}
              </p>
            </div>
            <div className="bg-white/80 p-6">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-accent">DNN</p>
              <p className="mt-4 break-keep font-sans text-sm leading-relaxed text-slate">
                {locale === "ko" ? "은닉층 3개 · 추가 복잡도의 개선 제한" : "Three hidden layers · limited gain from added complexity"}
              </p>
            </div>
          </div>
        </EvidenceFigure>
      </div>
    </div>
  );
}

function PhorageEvidence({ locale }: { locale: EvidenceLocale }) {
  const customerJourney = locale === "ko"
    ? ["브랜드 발견", "상품 탐색", "상품 상세", "장바구니", "주문 요청"]
    : ["Discover brand", "Browse products", "Product detail", "Cart", "Order request"];
  const operatorJourney = locale === "ko"
    ? ["Storefront", "Cart", "Order", "Admin 확인"]
    : ["Storefront", "Cart", "Order", "Admin review"];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceFigure
          locale={locale}
          status="verified"
          title={locale === "ko" ? "MVP 고객 여정" : "MVP customer journey"}
          source="Implemented storefront, product, cart, and order routes"
          caption={
            locale === "ko"
              ? "현재 MVP에서 구현된 고객 흐름을 정리했습니다. 사용자 행동 데이터나 공개 출시 후 전환율을 나타내는 자료는 아닙니다."
              : "The journey follows the currently implemented MVP routes. It does not represent observed public-user behavior, conversion, or launch traction."
          }
        >
          <FlowDiagram items={customerJourney} compact />
        </EvidenceFigure>

        <EvidenceFigure
          locale={locale}
          status="verified"
          title={locale === "ko" ? "고객–운영 업무 연결" : "Customer-to-operator workflow"}
          source="Current commerce and administration code"
          caption={
            locale === "ko"
              ? "상품 화면부터 주문 확인까지 고객과 운영자 업무가 연결되는 구조입니다. 운영 흐름의 구현 근거이며 대규모 주문 처리나 검증된 매출 성과를 뜻하지 않습니다."
              : "The workflow connects the customer-facing store to order review. It supports implemented service planning, not scaled order handling or verified sales performance."
          }
        >
          <FlowDiagram items={operatorJourney} compact />
        </EvidenceFigure>
      </div>

      <EvidenceFigure
        locale={locale}
        status="pending"
        title={locale === "ko" ? "실물 제품 사진" : "Physical product photography"}
        caption={
          locale === "ko"
            ? "실물 굿즈를 제작했지만 repository에는 출처와 공개 범위를 확인한 제품 이미지 export가 없습니다. 공개 안전성이 확인된 사진만 추후 추가하며, 프로젝트는 계속 공개 출시 전 MVP로 표시합니다."
            : "Physical goods were produced, but the repository does not contain a product-image export with confirmed provenance and public-use scope. Images remain pending, and the project remains explicitly pre-launch."
        }
      >
        <PendingEvidence
          label={locale === "ko" ? "공개 가능한 제품 이미지 확인 후 추가" : "Product images pending public-safe export"}
          detail={locale === "ko" ? "제품 수량·유형·촬영물 사용 범위를 확인한 뒤 대표 이미지를 추가합니다." : "Confirm product count, type, and image-use scope before adding representative photography."}
        />
      </EvidenceFigure>
    </div>
  );
}

function SurveyEvidence({ locale }: { locale: EvidenceLocale }) {
  return (
    <div className="space-y-5">
      <EvidenceFigure
        locale={locale}
        status="verified"
        title={locale === "ko" ? "Workbook 카이제곱 요약" : "Workbook chi-square summary"}
        source="Blood Type and Personality Survey workbook · 101 responses"
        caption={
          locale === "ko"
            ? "workbook에 계산된 네 차원의 카이제곱 통계량과 최소 기대빈도를 표시합니다. 모든 표에서 기대빈도 5 미만인 셀이 하나씩 있어 가정을 명시해야 하며, 한 차원의 값만으로 광범위한 과학적 관계를 입증할 수 없습니다."
            : "The table reports the workbook's four chi-square statistics and minimum expected frequencies. Each test contains one expected cell below five, and one isolated result cannot establish a broad scientific relationship."
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left font-mono text-[10px] uppercase tracking-[0.13em] text-slate">
                <th className="px-3 py-3">{locale === "ko" ? "MBTI 차원" : "MBTI dimension"}</th>
                <th className="px-3 py-3">χ²</th>
                <th className="px-3 py-3">{locale === "ko" ? "최소 기대빈도" : "Minimum expected"}</th>
                <th className="px-3 py-3">{locale === "ko" ? "보고 상태" : "Reporting status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {surveyChiSquare.map((row) => (
                <tr key={row.dimension}>
                  <td className="px-3 py-4 font-bold">{row.dimension}</td>
                  <td className="px-3 py-4 font-mono">{row.statistic.toFixed(4)}</td>
                  <td className="px-3 py-4 font-mono">{row.minimumExpected.toFixed(3)}</td>
                  <td className="px-3 py-4 text-slate">{locale === "ko" ? "p-value 재확인 필요" : "p-value check pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EvidenceFigure>

      <EvidenceFigure
        locale={locale}
        status="verified"
        title={locale === "ko" ? "T/F 관측빈도와 기대빈도" : "T/F observed and expected frequencies"}
        source="Blood Type and Personality Survey workbook · T/F table"
        caption={
          locale === "ko"
            ? "T/F 차원의 혈액형별 관측값과 독립 가정 아래 기대값을 그대로 표시합니다. AB–F 기대빈도는 4.950으로 5보다 작으며, 이 표만으로 혈액형과 성격의 관계를 일반화할 수 없습니다."
            : "The table reproduces T/F observed counts and independence-based expected counts by blood type. The AB–F expected count is 4.950, below five, and the table does not support a generalized blood-type/personality claim."
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left font-mono text-[10px] uppercase tracking-[0.13em] text-slate">
                <th className="px-3 py-3">{locale === "ko" ? "혈액형" : "Blood type"}</th>
                <th className="px-3 py-3">T · {locale === "ko" ? "관측" : "observed"}</th>
                <th className="px-3 py-3">T · {locale === "ko" ? "기대" : "expected"}</th>
                <th className="px-3 py-3">F · {locale === "ko" ? "관측" : "observed"}</th>
                <th className="px-3 py-3">F · {locale === "ko" ? "기대" : "expected"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {surveyTfFrequencies.map((row) => (
                <tr key={row.bloodType}>
                  <td className="px-3 py-4 font-bold">{row.bloodType}</td>
                  <td className="px-3 py-4 font-mono">{row.observedT}</td>
                  <td className="px-3 py-4 font-mono text-slate">{row.expectedT.toFixed(3)}</td>
                  <td className="px-3 py-4 font-mono">{row.observedF}</td>
                  <td className={`px-3 py-4 font-mono ${row.expectedF < 5 ? "font-bold text-amber-800" : "text-slate"}`}>
                    {row.expectedF.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EvidenceFigure>
    </div>
  );
}

function HorizontalBars({
  items,
  valueSuffix = "",
  valueFormatter,
}: {
  items: Array<{ label: string; value: number; detail?: string }>;
  valueSuffix?: string;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value));

  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-end justify-between gap-4 font-sans text-xs">
            <span className="font-semibold text-slate">{item.label}</span>
            <span className="font-mono text-slate">
              {valueFormatter ? valueFormatter(item.value) : item.value.toFixed(2)}{valueSuffix}
              {item.detail ? ` · ${item.detail}` : ""}
            </span>
          </div>
          <div className="h-2.5 bg-black/[0.045]">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.max((item.value / max) * 100, 1)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowDiagram({ items, compact = false }: { items: string[]; compact?: boolean }) {
  const gridColumns = compact
    ? "lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]"
    : "md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]";
  const arrowVisibility = compact ? "lg:flex" : "md:flex";

  return (
    <div className={`grid items-stretch gap-2 ${gridColumns}`}>
      {items.map((item, index) => (
        <div key={item} className="contents">
          <div className="grid min-h-24 place-items-center border border-accent/15 bg-accent/[0.035] p-4 text-center">
            <span className="break-keep font-sans text-sm font-semibold leading-relaxed text-ink-body">{item}</span>
          </div>
          {index < items.length - 1 && (
            <span className={`hidden items-center justify-center text-accent ${arrowVisibility}`} aria-hidden="true">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfitabilityTrend() {
  const width = 680;
  const height = 280;
  const padX = 48;
  const padY = 30;
  const min = -8;
  const max = 20;
  const x = (index: number) => padX + (index * (width - padX * 2)) / (koreanAirProfitability.length - 1);
  const y = (value: number) => padY + ((max - value) * (height - padY * 2)) / (max - min);
  const series = [
    { key: "netMargin" as const, label: "Net margin", color: "#4A5D4E" },
    { key: "roe" as const, label: "ROE", color: "#8B6F47" },
    { key: "roa" as const, label: "ROA", color: "#718096" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-4 font-sans text-[10px] text-slate">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className="h-0.5 w-5" style={{ backgroundColor: item.color }} />{item.label}
          </span>
        ))}
      </div>
      <svg className="mt-4 h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reported Korean Air profitability ratio trends from 2020 to 2024">
        {[0, 10, 20].map((tick) => (
          <g key={tick}>
            <line x1={padX} x2={width - padX} y1={y(tick)} y2={y(tick)} stroke="rgba(0,0,0,0.08)" />
            <text x={padX - 10} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{tick}%</text>
          </g>
        ))}
        <line x1={padX} x2={width - padX} y1={y(0)} y2={y(0)} stroke="rgba(0,0,0,0.25)" />
        {series.map((item) => {
          const points = koreanAirProfitability.map((row, index) => `${x(index)},${y(row[item.key])}`).join(" ");
          return (
            <g key={item.label}>
              <polyline points={points} fill="none" stroke={item.color} strokeWidth="3" />
              {koreanAirProfitability.map((row, index) => (
                <circle key={row.year} cx={x(index)} cy={y(row[item.key])} r="4" fill={item.color} />
              ))}
            </g>
          );
        })}
        {koreanAirProfitability.map((row, index) => (
          <text key={row.year} x={x(index)} y={height - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{row.year}</text>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Reported profitability ratios</caption>
        <thead><tr><th>Year</th><th>Net margin</th><th>ROE</th><th>ROA</th></tr></thead>
        <tbody>{koreanAirProfitability.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.netMargin}</td><td>{row.roe}</td><td>{row.roa}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Checklist({ rows, locale }: { rows: string[][]; locale: EvidenceLocale }) {
  return (
    <ul className="grid gap-px bg-black/5 md:grid-cols-2">
      {rows.map(([item, status]) => {
        const isPending = /pending|필요/i.test(status);
        return (
          <li key={item} className="flex items-center justify-between gap-4 bg-white/80 p-4 font-sans text-sm">
            <span className="break-keep text-ink-body">{item}</span>
            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] ${isPending ? "text-amber-800" : "text-accent"}`}>
              {status}
            </span>
          </li>
        );
      })}
      <li className="md:col-span-2 bg-amber-50 p-4 font-sans text-xs leading-relaxed text-amber-900">
        {locale === "ko" ? "Paper-trading 검증 전용 · 실거래 운영 및 수익 성과를 주장하지 않습니다." : "Paper-trading validation only · no real-money operation or return claim."}
      </li>
    </ul>
  );
}

function MetricCards({ metrics }: { metrics: string[][] }) {
  return (
    <div className="grid gap-px bg-black/5 sm:grid-cols-2">
      {metrics.map(([label, value]) => (
        <div key={label} className="bg-white/80 p-5">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate">{label}</p>
          <p className="mt-2 font-mono text-xl font-bold text-accent">{value}</p>
        </div>
      ))}
    </div>
  );
}
