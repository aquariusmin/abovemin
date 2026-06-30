import type { PortfolioProject } from "@/data/portfolio";

export const koreanPortfolioProjects: PortfolioProject[] = [
  {
    slug: "telecom-churn",
    number: "01",
    title: "Telecom Customer Churn Analysis",
    category: "고객 분석 · 전략",
    period: "2025년 여름방학",
    role: "개인 프로젝트 · KW-Corporation 교내 가상기업 프로그램",
    summary:
      "통신 고객 7,043명의 데이터를 분석하고 설명 가능한 분류모형을 활용해 이탈 위험군과 고객 유지 전략을 제안한 프로젝트입니다.",
    question:
      "어떤 고객이 이탈할 가능성이 높은지, 위험을 높이는 요인은 무엇인지, 고객군별로 어떤 대응을 우선해야 하는지 분석할 수 있을까?",
    evidence: [
      "고객 특성, 계약, 이용 기간, 요금, 결제, 서비스 이용, 이탈 여부를 포함한 7,043건의 고객 데이터",
      "학습·테스트 데이터 70:30 분할과 7개 분류모형 비교",
      "ROC-AUC, precision, recall, F1-score를 활용한 모형 평가",
    ],
    tools: ["Python", "pandas", "scikit-learn", "Gradient Boosting", "XGBoost", "SHAP"],
    process: [
      {
        title: "분석 데이터 정리",
        description:
          "TotalCharges의 공란을 처리하고 범주형 변수를 인코딩해 학습과 평가에 사용할 데이터를 구성했습니다.",
      },
      {
        title: "의미 있는 고객군 탐색",
        description:
          "계약 유형, 이용 기간, 월 요금, 결제 방식, 부가서비스 이용 여부에 따른 이탈 패턴을 비교했습니다.",
      },
      {
        title: "모형 비교와 해석",
        description:
          "7개 분류모형을 비교하고 보고된 ROC-AUC가 가장 높았던 Gradient Boosting을 최종 모형으로 선택한 뒤, SHAP과 dependence 분석으로 주요 요인을 해석했습니다.",
      },
      {
        title: "분석을 실행안으로 연결",
        description:
          "위험 요인을 계약 전환, 초기 고객 관리, 기술지원 서비스 등 구체적인 고객 유지 아이디어와 연결했습니다.",
      },
    ],
    insights: [
      "월 단위 계약은 가장 뚜렷한 이탈 위험 신호로 나타났습니다.",
      "이용 기간이 짧고 월 요금이 높을수록 이탈 위험이 커지는 경향을 확인했습니다.",
      "보안·기술지원 관련 일부 서비스의 미이용도 추가적인 위험 신호로 나타났습니다.",
      "Gradient Boosting의 보고된 ROC-AUC는 약 0.842이며, 정확한 수치는 재현 가능한 최종 지표표로 다시 확인해야 합니다.",
    ],
    decisionValue:
      "단순히 이탈 여부를 예측하는 데서 그치지 않고, 어떤 고객군에 어떤 대응을 우선할지 정리했습니다. 이탈률 5.0%p 감소는 분석을 바탕으로 제안한 목표이며, 실제 달성 성과가 아닙니다.",
    limitations: [
      "공개 데이터에는 캠페인 노출, 민원 이력, 개입 비용, 실제 고객 유지 결과가 포함되어 있지 않습니다.",
      "정확한 성능 수치를 공개하기 전 최종 파이프라인, 하이퍼파라미터, random seed와 지표표를 재현해야 합니다.",
      "제안한 전략의 효과는 명확한 유지 KPI와 실험을 통해 검증해야 합니다.",
    ],
    suggestedVisuals: [
      "계약 유형별 이탈률 차트",
      "7개 모형 성능 비교표",
      "SHAP 주요 변수 요약",
      "고객군별 제안 전략 매트릭스",
    ],
    caution:
      "이탈률 5.0%p 감소는 분석을 통해 제안한 기획 목표입니다. 실제로 이탈률을 낮춘 성과로 표현하지 않습니다.",
  },
  {
    slug: "satellite-gdp",
    number: "02",
    title: "Satellite Night-Light GDP Analysis",
    category: "경제 분석 · 대체 데이터",
    period: "2025년 봄학기",
    role: "개인 프로젝트",
    summary:
      "VIIRS 야간조도와 World Bank 지표를 결합해 위성에서 관측한 빛의 밝기가 국가 경제활동을 보완적으로 설명할 수 있는지 살펴본 프로젝트입니다.",
    question:
      "공식 통계가 제한된 환경에서 야간조도는 GDP를 설명하는 보완 지표가 될 수 있으며, 도시인구와 전력 접근성은 이 관계에 어떤 영향을 줄까?",
    evidence: [
      "VIIRS 야간조도와 World Bank의 GDP, 인구, 도시인구, 전력 접근성 지표",
      "주요 분석 기간: 2019~2023년",
      "데이터 단계별 표본: 원자료 973행, 병합 자료 820개 관측치, GDP 사용 가능 관측치 791개",
    ],
    tools: ["Python", "SPSS", "Excel", "Regression", "Interaction effects"],
    process: [
      {
        title: "국가·연도 데이터 통합",
        description:
          "위성 밝기 데이터와 경제지표를 국가·연도 단위로 병합했습니다.",
      },
      {
        title: "변수 전처리",
        description:
          "분포가 치우친 변수에 로그 변환을 적용하고 조절변수를 중심화했습니다.",
      },
      {
        title: "관계와 상호작용 검정",
        description:
          "기본 회귀모형을 추정한 뒤 도시인구와 전력 접근성의 상호작용항을 추가했습니다.",
      },
      {
        title: "해석 범위 설정",
        description:
          "모형 적합도와 함께 인프라 수준, 결측치, 경제활동 이외의 빛 발생 요인을 고려해 결과의 활용 범위를 정리했습니다.",
      },
    ],
    insights: [
      "보고된 단순 회귀모형에서 야간조도는 GDP 변동의 81.9%를 설명했습니다(R² = 0.819).",
      "보고서에서는 도시인구와 전력 접근성의 상호작용 효과가 통계적으로 유의하게 나타났습니다.",
      "이 결과는 설명적 관계이며 예측 정확도나 인과관계의 증거로 해석할 수 없습니다.",
    ],
    decisionValue:
      "야간조도는 기존 통계가 제한된 국가를 초기 스크리닝하거나 국가 위험과 경제 변화를 모니터링할 때 활용할 수 있는 보완 신호입니다.",
    limitations: [
      "최종 국가 수와 973·820·791로 구분되는 데이터 단계는 재현 가능한 데이터 사전으로 정리해야 합니다.",
      "과거 연도의 Albania 관측치와 최종 밝기 변수 정의를 다시 대조해야 합니다.",
      "예측 목적의 주장을 하려면 고정효과와 표본 외 검증이 추가로 필요합니다.",
    ],
    suggestedVisuals: [
      "VIIRS·World Bank 데이터 결합 과정",
      "로그 야간조도와 로그 GDP 산점도",
      "조절효과 개념도",
      "해석 가능한 범위와 불가능한 범위",
    ],
    caution:
      "R² = 0.819는 보고된 단순 회귀모형의 설명력을 뜻합니다. 이를 81.9%의 예측 정확도로 표현하지 않습니다.",
  },
  {
    slug: "korean-air",
    number: "03",
    title: "Korean Air Financial Analysis",
    category: "재무 분석 · 전략",
    period: "2025년 봄학기",
    role: "개인 프로젝트",
    summary:
      "거시경제와 항공산업, 재무비율, 복수의 가치평가 방법을 종합하고 FCF 가정의 불확실성에 따라 평가 결과가 충돌하는 이유를 분석했습니다.",
    question:
      "팬데믹 이후의 회복, 대규모 투자, 부채 부담과 불확실한 현금흐름 가정으로 가치평가 결과가 달라질 때 대한항공을 어떻게 해석해야 할까?",
    evidence: [
      "2020~2024년 수익성, 활동성, 유동성, 레버리지, 이자보상능력 분석",
      "거시경제와 항공산업 조사",
      "DCF, APV, 유사기업 배수, 민감도 분석과 reverse engineering",
    ],
    tools: ["Financial statements", "DCF", "APV", "Multiples", "WACC", "Excel"],
    process: [
      {
        title: "산업과 거시환경 파악",
        description:
          "팬데믹 이후 경기와 항공수요 회복, 유가, 환율, 통합 관련 위험을 조사했습니다.",
      },
      {
        title: "재무 흐름 분석",
        description:
          "2020~2024년의 수익성, 활동성, 유동성, 레버리지와 이자보상능력 변화를 분석했습니다.",
      },
      {
        title: "가치평가 방법 비교",
        description:
          "약 2.8%로 추정한 WACC를 바탕으로 DCF, APV와 유사기업 비교가치를 검토했습니다.",
      },
      {
        title: "평가 차이의 원인 진단",
        description:
          "민감도 분석과 reverse engineering을 통해 절대가치와 상대가치 결과가 충돌한 원인을 추적했습니다.",
      },
    ],
    insights: [
      "일부 CAPEX와 운전자본 가정에서는 FCF가 음수가 되어 DCF와 APV 결과가 음수이거나 불안정하게 나타났습니다.",
      "상대가치평가는 절대가치평가보다 긍정적인 해석을 제시했습니다.",
      "핵심은 특정 목표가격이 아니라 가정에 민감한 절대가치와 상대가치의 충돌 자체였습니다.",
    ],
    decisionValue:
      "평가 방법별 결과가 크게 다를 때는 수치를 기계적으로 평균하거나 인상적인 숫자를 제시하기보다, 먼저 가정과 계산 구조를 점검해야 합니다.",
    limitations: [
      "현재 확인할 수 없는 가치평가 작업 파일을 재구성하고 점검해야 합니다.",
      "공개 전 수식, 비교기업 구성, 단위, 기준일, 추정치와 목표가격 계산을 검증해야 합니다.",
      "재무·시장 데이터의 정확한 출처와 기준일을 기록해야 합니다.",
    ],
    suggestedVisuals: [
      "2020~2024년 주요 재무비율 추이",
      "절대가치와 상대가치 결과 비교",
      "FCF 가정 변화 브리지",
      "가치평가 검증 체크리스트",
    ],
    caution:
      "수업과 보고서 맥락에서 수행한 조건부 분석입니다. 투자 조언이나 검증된 공개 목표가격으로 제시하지 않습니다.",
  },
  {
    slug: "quant-trading-fleet",
    number: "04",
    title: "Quant Trading Fleet",
    category: "핀테크 · 서비스 운영",
    period: "2025년~현재",
    role: "개인 프로젝트",
    summary:
      "전략 봇, broker abstraction, 실행 데이터, 제어 기능, 로그와 모니터링 대시보드를 연결한 자동매매 검증 시스템을 구축하고 라이브 서버에서 paper trading으로 점검하고 있습니다.",
    question:
      "개별 매매 규칙을 단독 스크립트가 아니라 운영자가 통제하고 관찰할 수 있는 서비스로 전환하려면 어떤 인프라가 필요할까?",
    evidence: [
      "KIS와 Binance/CCXT broker interface",
      "봇 상태, 전략 설정, 로그와 주문 실행 이력",
      "라이브 서버 기반 paper-trading 검증",
    ],
    tools: ["Python", "FastAPI", "React", "TypeScript", "SQLite", "SQLAlchemy", "Docker"],
    process: [
      {
        title: "전략과 broker 로직 분리",
        description:
          "거래소별 데이터와 주문 처리 차이를 분리하기 위해 broker abstraction을 설계했습니다.",
      },
      {
        title: "상태와 이력의 가시화",
        description:
          "봇 상태, 설정, 실행 이력과 운영 로그를 SQLite에 저장하도록 구성했습니다.",
      },
      {
        title: "운영자 제어 기능 구현",
        description:
          "FastAPI 서비스와 비동기 봇 제어, React·TypeScript 대시보드를 구현했습니다.",
      },
      {
        title: "운영 검증",
        description:
          "서비스를 컨테이너화하고 라이브 서버에서 paper trading 기반 운영 검증을 시작했습니다.",
      },
    ],
    insights: [
      "자동매매는 전략 개발뿐 아니라 운영 설계의 문제이기도 합니다.",
      "사용 가능한 서비스가 되려면 상태 확인, 로그, 파라미터 관리, 테스트 모드, 복구 절차와 사람의 감독이 필요합니다.",
      "이 프로젝트를 통해 금융 서비스 데이터가 생성·저장·모니터링·관리되는 구조를 구체화했습니다.",
    ],
    decisionValue:
      "전략의 실행 과정을 관찰 가능한 형태로 만들고, 실거래를 고려하기 전에 paper trading 환경에서 체계적으로 검증할 수 있는 운영 기반을 구축했습니다.",
    limitations: [
      "정식 paper-trading 검증 보고서를 추가로 작성해야 합니다.",
      "가동시간, 주문 실패, 대사, 중복 주문, 재시작과 로그 기준을 명확히 정의해야 합니다.",
      "안정적인 시스템으로 표현하기 전 모든 전략과 broker mode를 처음부터 끝까지 검증해야 합니다.",
    ],
    suggestedVisuals: [
      "전략부터 대시보드까지의 시스템 구조",
      "Paper Trading으로 표시한 익명화 대시보드",
      "봇 상태 전환 다이어그램",
      "Paper-trading 운영 검증표",
    ],
    caution:
      "라이브 서버에서 진행하는 paper-trading 검증 단계입니다. 실거래 운영, 수익률, 승률, 수익성 또는 자본 증가를 주장하지 않습니다.",
  },
  {
    slug: "financial-ai-model-study",
    number: "05",
    title: "Financial AI Model Study",
    category: "응용 분석 · 모형 선택",
    period: "2024년 가을학기",
    role: "개인 프로젝트 시리즈",
    summary:
      "회귀, 차원축소, tree, support vector와 neural network 모형을 비교하며 복잡한 모형이 언제 일반화 성능 개선으로 이어지는지 학습한 프로젝트입니다.",
    question:
      "전처리, 정규화, 모형 복잡도와 하이퍼파라미터는 validation과 test 성능에 어떤 영향을 줄까?",
    evidence: [
      "금융·공개 데이터를 활용한 4개 응용 과제",
      "학습, 검증, 테스트 결과 비교",
      "RMSE, MSE, ROC-AUC, scree plot, tuning surface와 loss curve",
    ],
    tools: ["Python", "scikit-learn", "TensorFlow/Keras", "PCA", "SVM/SVR", "ANN/DNN"],
    process: [
      {
        title: "모형 복잡도 비교",
        description:
          "별도 평가 데이터의 성능을 기준으로 다항회귀 차수와 decision tree 설정을 비교했습니다.",
      },
      {
        title: "표현과 정규화 분석",
        description:
          "PCA, 표준화, Ridge와 Lasso를 적용해 데이터 구조와 overfitting을 살펴봤습니다.",
      },
      {
        title: "Support Vector 모형 조정",
        description:
          "Iowa housing 데이터에서 Linear SVR 파라미터 조합을 비교했습니다.",
      },
      {
        title: "Neural Network 깊이 비교",
        description:
          "선형회귀, 은닉층 1개의 ANN과 은닉층 3개의 DNN을 비교했습니다.",
      },
    ],
    insights: [
      "국가위험 예시에서 보고된 첫 두 PCA 주성분이 전체 분산의 약 88.4%를 설명했습니다.",
      "비교한 조합에서는 C=1, epsilon=50인 Linear SVR의 성능이 가장 좋았습니다.",
      "더 깊은 DNN은 작은 ANN과 비교해 큰 개선을 보이지 않았습니다.",
    ],
    decisionValue:
      "복잡한 방법이라는 이유만으로 선택하지 않고, validation 결과가 실제 개선을 뒷받침할 때만 추가 복잡도를 채택해야 한다는 기준을 확인했습니다.",
    limitations: [
      "원본 데이터와 데이터 사전을 복구해야 합니다.",
      "4개 과제를 재현 가능한 노트북으로 통합해야 합니다.",
      "수업 과제의 성능 수치를 실제 운영 환경의 성과로 표현할 수 없습니다.",
    ],
    suggestedVisuals: [
      "PCA scree plot",
      "Linear SVR tuning surface",
      "Decision tree train/test 비교",
      "ANN·DNN validation loss 비교",
    ],
  },
  {
    slug: "phorage",
    number: "06",
    title: "Phorage Brand and Commerce MVP",
    category: "서비스 기획 · MVP",
    period: "2025년~현재",
    role: "개인 프로젝트",
    summary:
      "브랜드 콘셉트, 실제 사진 굿즈 제작, 고객 여정, 커머스 흐름과 관리자 기능까지 연결한 공개 출시 전 MVP 프로젝트입니다.",
    question:
      "개인 사진 작업의 콘셉트를 공개 출시 전에 검증 가능한 제품과 서비스 경험으로 어떻게 구체화할 수 있을까?",
    evidence: [
      "실물 사진 굿즈 제작",
      "상품 탐색, 장바구니, 주문과 관리자 업무 흐름",
      "지인 대상의 제한적인 공유 또는 판매",
    ],
    tools: ["Service planning", "Next.js", "React", "TypeScript", "Supabase", "Zustand"],
    process: [
      {
        title: "브랜드 콘셉트 정의",
        description:
          "사진 굿즈를 중심으로 브랜드 이야기와 고객이 경험해야 할 분위기를 정리했습니다.",
      },
      {
        title: "실물 제품 제작",
        description:
          "화면 시안에 머무르지 않고 실제로 사용할 수 있는 사진 굿즈를 제작했습니다.",
      },
      {
        title: "서비스 흐름 구현",
        description:
          "상품 목록, 필터, 상품 상세, 장바구니, 주문과 관리자 업무 흐름을 구현했습니다.",
      },
      {
        title: "제한적인 초기 테스트",
        description:
          "공개 출시 전에 소수의 지인에게 굿즈를 공유하거나 판매했습니다.",
      },
    ],
    insights: [
      "창작 제품은 일관된 고객 경험뿐 아니라 실제로 작동하는 운영 과정도 필요합니다.",
      "MVP를 통해 공개 출시 전에 고객과 운영자 양쪽의 흐름을 확인할 수 있었습니다.",
      "지인 대상 활동은 초기 학습에는 유용하지만 공개 시장에서 확인된 고객 반응으로 볼 수 없습니다.",
    ],
    decisionValue:
      "서비스 기획, MVP 우선순위 설정, 실물과 디지털 경험의 연결, 출시 가설과 검증 지표 설계 과정을 경험했습니다.",
    limitations: [
      "제작한 굿즈의 수량과 유형을 문서화해야 합니다.",
      "선물, 제품 테스트와 유상 판매를 구분해 기록해야 합니다.",
      "목표 고객, 정성적 피드백과 출시 후 확인할 지표를 정의해야 합니다.",
    ],
    suggestedVisuals: [
      "실물 제품 사진",
      "고객 여정 지도",
      "상품 화면·관리자 화면",
      "출시 전 가설과 검증 지표표",
    ],
    caution:
      "공개 출시 전 MVP입니다. 공개 출시, 공개 시장에서 확인된 고객 반응, 대규모 주문이나 검증된 매출 성과를 주장하지 않습니다.",
  },
  {
    slug: "blood-type-survey",
    number: "07",
    title: "Blood Type and Personality Survey Study",
    category: "연구 설계 · 통계",
    period: "2023년 가을학기",
    role: "팀 프로젝트 · 설문 설계, 데이터 정리, 분석, 시각화 담당",
    summary:
      "혈액형과 MBTI의 네 가지 차원이 통계적으로 관련되는지 확인하기 위해 101명의 응답을 수집하고 분석한 설문 연구입니다.",
    question:
      "혈액형과 성격에 관한 익숙한 통념을 검증 가능한 가설로 바꾸고 설문 데이터로 확인하면 그 관계가 지지될까?",
    evidence: [
      "28문항의 Google Forms 설문",
      "응답 101건",
      "MBTI 네 차원별 관측빈도와 기대빈도",
    ],
    tools: ["Survey design", "Excel", "Cross-tabulation", "Chi-square tests", "Visualization"],
    process: [
      {
        title: "연구와 문항 설계",
        description:
          "인구통계, 혈액형, MBTI 관련 문항과 응답 점검 문항을 함께 설계했습니다.",
      },
      {
        title: "응답 데이터 정리",
        description:
          "101건의 응답을 정리하고 교차분석에 사용할 형태로 구성했습니다.",
      },
      {
        title: "독립성 검정",
        description:
          "관측빈도와 기대빈도를 계산하고 카이제곱 독립성 검정을 적용했습니다.",
      },
      {
        title: "결론의 범위 제한",
        description:
          "20대에 집중된 표본, 지인 중심 모집과 측정상의 한계를 함께 고려해 결론을 제한했습니다.",
      },
    ],
    insights: [
      "MBTI의 세 차원에서는 혈액형과 통계적으로 유의한 관련성이 나타나지 않았습니다.",
      "한 차원에서만 보고된 유의수준을 넘는 결과가 나타났습니다.",
      "하나의 유의한 결과만으로 혈액형과 성격의 광범위한 관계를 입증할 수 없습니다.",
    ],
    decisionValue:
      "대중적인 통념을 검증 가능한 가설로 바꾸고, 데이터가 실제로 뒷받침하는 범위 안에서만 결론을 내리는 과정을 보여줍니다.",
    limitations: [
      "표본이 20대와 팀원 지인에 집중되어 있습니다.",
      "팀 규모와 세부 업무 분담은 추가 확인이 필요합니다.",
      "정확한 p-value와 기대빈도 조건을 다시 확인해 보고해야 합니다.",
    ],
    suggestedVisuals: [
      "설문·가설 검정 흐름",
      "표본 특성 요약",
      "관측빈도·기대빈도 비교표",
      "연구 한계 패널",
    ],
    caution:
      "한 차원의 유의한 결과만으로 혈액형과 성격 사이의 광범위한 과학적 관계를 입증할 수 없습니다.",
  },
];

export function getKoreanPortfolioProject(slug: string) {
  return koreanPortfolioProjects.find((project) => project.slug === slug);
}
