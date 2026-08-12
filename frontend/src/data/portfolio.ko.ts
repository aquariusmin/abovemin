import type { PortfolioProject } from "@/data/portfolio";

export const koreanPortfolioProjects: PortfolioProject[] = [
  {
    slug: "telecom-churn",
    number: "01",
    title: "Telecom Customer Churn Analysis",
    category: "고객 분석 · 전략",
    period: "2025년 여름방학",
    role: "개인 프로젝트 · KW-Corporation 교내 가상기업 프로그램",
    sourceUrl: "https://github.com/aquariusmin/kw-corp-churn-strategy-analysis",
    summary:
      "통신 고객 7,043건을 살펴보며 누가 이탈할 가능성이 큰지, 그 신호를 어떤 유지 전략으로 이어볼 수 있는지 정리했습니다.",
    question:
      "이탈 가능성이 높은 고객은 누구이고, 그 고객에게 먼저 건넬 대응은 무엇이어야 할까?",
    storyArc: [
      "처음에는 이탈 예측 점수를 만드는 일보다, 영업·마케팅팀이 바로 볼 수 있는 위험 신호를 찾는 데 초점을 뒀습니다.",
      "계약 형태, 이용 기간, 월 요금, 결제 방식처럼 고객이 실제로 지나온 흔적을 기준으로 이탈률과 모델 결과를 함께 봤습니다.",
      "가장 강하게 보인 신호는 월 단위 계약이었고, 짧은 이용 기간과 높은 월 요금도 같은 방향으로 움직였습니다.",
      "다만 5.0%p 감소는 실행 전 목표입니다. 실제 성과처럼 쓰지 않고, 검증해야 할 제안으로 남겼습니다.",
    ],
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
      "예측 점수 자체보다 어떤 고객군부터 챙길지 정리한 데 의미를 뒀습니다. 5.0%p 감소는 실행 전 목표라 실제 성과처럼 쓰지 않았습니다.",
    limitations: [
      "공개 데이터에는 캠페인 노출, 민원 이력, 개입 비용, 실제 고객 유지 결과가 포함되어 있지 않습니다.",
      "정확한 성능 수치는 최종 파이프라인과 지표표가 같은 기준으로 재현될 때만 공개할 수 있습니다.",
      "제안한 전략은 실험을 거쳐야 실제 효과로 말할 수 있습니다.",
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
    category: "경제 분석 · 대체 데이터",
    period: "2025년 봄학기",
    role: "개인 프로젝트",
    sourceUrl: "https://github.com/aquariusmin/Satellite-GDP-Insight",
    summary:
      "야간 위성 조도와 World Bank 지표를 엮어, 공식 통계가 부족한 곳에서도 경제활동의 단서를 읽을 수 있는지 살펴봤습니다.",
    question:
      "공식 통계가 부족할 때 밤의 밝기는 GDP를 읽는 보조 단서가 될 수 있을까?",
    storyArc: [
      "국가별 경제활동을 꼭 전통 통계로만 봐야 하는지 궁금해서, 위성에서 보이는 밤의 밝기를 GDP와 나란히 놓고 봤습니다.",
      "VIIRS 야간조도와 World Bank 지표를 국가·연도 단위로 맞추고, 로그 변환과 상호작용항을 통해 관계를 확인했습니다.",
      "보고서 기준 단순 회귀에서는 R² = 0.819가 나왔고, 도시인구와 전력 접근성도 해석에 영향을 주는 변수로 보였습니다.",
      "이 결과는 예측 정확도나 인과관계가 아니라 설명적 관계입니다. 그래서 보조 신호라는 선을 지켰습니다.",
    ],
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
      "야간조도는 시장 진입 전 국가를 거칠게 가려보거나 위험 변화를 모니터링할 때 참고할 수 있는 보조 신호입니다.",
    limitations: [
      "973·820·791은 데이터 처리 단계가 다르므로 하나의 표본 크기처럼 섞어 쓰지 않았습니다.",
      "밝기 변수 정의가 보고서와 파일 사이에서 어긋날 수 있어 산점도 주장은 제외했습니다.",
      "예측이나 인과를 말하려면 고정효과와 표본 외 검증이 따로 필요합니다.",
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
    category: "재무 분석 · 전략",
    period: "2025년 봄학기",
    role: "개인 프로젝트",
    sourceUrl: "https://github.com/aquariusmin/koreanair_equity_research",
    summary:
      "대한항공을 재무비율, 산업 흐름, DCF·APV·멀티플로 나눠 보면서 가치평가 결과가 왜 서로 달라지는지 추적했습니다.",
    question:
      "같은 회사를 봐도 가치평가 방법마다 결론이 달라질 때, 어떤 가정을 먼저 의심해야 할까?",
    storyArc: [
      "대한항공은 회복 기대와 투자 부담이 함께 보이는 회사라, 한 가지 방식으로만 보면 결론이 쉽게 흔들린다고 봤습니다.",
      "2020~2024년 재무비율을 먼저 보고, DCF·APV·유사기업 배수와 민감도 분석을 나란히 비교했습니다.",
      "절대가치평가와 상대가치평가가 다른 방향을 가리켰고, 차이의 핵심은 FCF와 투자 가정에 있었습니다.",
      "그래서 목표가격을 앞세우기보다, 계산 구조와 가정이 어디서 흔들리는지 보여주는 사례로 정리했습니다.",
    ],
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
      "숫자가 크게 갈릴 때는 평균값보다 가정 점검이 먼저라는 걸 보여주는 사례로 정리했습니다.",
    limitations: [
      "가치평가 작업 파일의 수식과 단위가 완전히 감사된 상태는 아닙니다.",
      "그래서 목표가격보다 가정 민감도와 방법별 차이에 초점을 맞췄습니다.",
      "재무·시장 데이터는 보고서의 기준일과 수업 맥락 안에서 해석했습니다.",
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
    category: "핀테크 · 서비스 운영",
    period: "2025년~현재",
    role: "개인 프로젝트",
    sourceUrl: "https://github.com/aquariusmin/quant_trading_fleet",
    summary:
      "전략 코드를 그냥 돌리는 수준을 넘어서, 봇 상태·설정·실행 이력·로그를 웹에서 보고 제어할 수 있는 모의투자 운영 시스템을 만들었습니다.",
    question:
      "매매 규칙을 서비스처럼 운영하려면 전략 코드 말고 무엇이 더 필요할까?",
    storyArc: [
      "처음 문제의식은 단순했습니다. 전략이 맞는지 보기 전에, 그 전략을 안전하게 켜고 끄고 지켜볼 수 있어야 했습니다.",
      "브로커 인터페이스, 봇 상태, 설정값, 주문 이력, 로그를 한 흐름 안에 묶고 FastAPI와 대시보드로 제어했습니다.",
      "작업을 하면서 자동매매는 모델보다 운영 문제가 더 크게 드러날 수 있다는 점을 확인했습니다.",
      "현재는 라이브 서버의 모의투자 검증 단계입니다. 실거래 성과나 수익률은 주장하지 않습니다.",
    ],
    evidence: [
      "KIS와 Binance/CCXT broker interface",
      "봇 상태, 전략 설정, 로그와 주문 실행 이력",
      "라이브 서버 기반 모의투자 검증",
    ],
    tools: ["Python", "FastAPI", "React", "TypeScript", "SQLite", "SQLAlchemy", "Docker"],
    process: [
      {
        title: "전략과 broker 로직 분리",
        description:
          "거래소별 데이터와 주문 처리 차이를 분리하기 위해 브로커 추상화 계층을 설계했습니다.",
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
          "서비스를 컨테이너화하고 라이브 서버에서 모의투자 기반 운영 검증을 시작했습니다.",
      },
    ],
    insights: [
      "자동매매는 전략 개발뿐 아니라 운영 설계의 문제이기도 합니다.",
      "사용 가능한 서비스가 되려면 상태 확인, 로그, 파라미터 관리, 테스트 모드, 복구 절차와 사람의 감독이 필요합니다.",
      "이 프로젝트를 통해 금융 서비스 데이터가 생성·저장·모니터링·관리되는 구조를 구체화했습니다.",
    ],
    decisionValue:
      "실거래 성과를 말하기보다, 전략을 안전하게 관찰하고 멈추고 기록할 수 있는 운영 기반을 만든 데 초점을 뒀습니다.",
    limitations: [
      "현재는 모의투자 운영 구조를 보여주는 단계입니다.",
      "장시간 가동, 주문 실패 처리, 재시작 시나리오는 별도 운영 기준으로 관리해야 합니다.",
      "그래서 수익률보다 제어·기록·관찰 가능성 중심으로 설명했습니다.",
    ],
    suggestedVisuals: [
      "전략부터 대시보드까지의 시스템 구조",
      "모의투자로 표시한 익명화 대시보드",
      "봇 상태 전환 다이어그램",
      "모의투자 운영 검증표",
    ],
    caution:
      "라이브 서버에서 진행하는 모의투자 검증 단계입니다. 실거래 운영, 수익률, 승률, 수익성 또는 자본 증가를 주장하지 않습니다.",
  },
  {
    slug: "financial-ai-model-study",
    number: "05",
    title: "Financial AI Model Study",
    category: "응용 분석 · 모형 선택",
    period: "2024년 가을학기",
    role: "개인 프로젝트 시리즈",
    sourceUrl: "https://github.com/aquariusmin/financial-ai-model-study",
    summary:
      "수업 과제 네 개를 묶어, 모형이 복잡해질수록 정말 성능이 좋아지는지 직접 비교했습니다.",
    question:
      "모형을 더 복잡하게 만드는 선택은 언제 도움이 되고, 언제 부담만 늘릴까?",
    storyArc: [
      "좋아 보이는 모델을 쓰는 것과 실제로 더 나은 모델을 고르는 것은 다르다고 보고, 과제들을 비교 관점으로 다시 묶었습니다.",
      "회귀, PCA, SVM/SVR, ANN/DNN을 각각 학습·검증·테스트 성능과 함께 보면서 복잡도의 효과를 확인했습니다.",
      "일부 과제에서는 단순한 모형이 더 안정적이었고, 더 깊은 신경망이 항상 의미 있는 개선을 만들지는 않았습니다.",
      "수업 과제의 결과라 운영 성과로 말하지 않고, 모델 선택 기준을 세운 경험으로 정리했습니다.",
    ],
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
      "좋아 보이는 모델보다 검증 결과가 납득되는 모델을 고르는 기준을 세운 작업입니다.",
    limitations: [
      "수업 과제 결과라 데이터 조건과 실험 범위가 제한적입니다.",
      "과제별 실험 환경이 달라 하나의 운영 성능처럼 묶지 않았습니다.",
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
    category: "서비스 기획 · MVP",
    period: "2025년~현재",
    role: "개인 프로젝트",
    sourceUrl: "https://github.com/aquariusmin/abovemin",
    summary:
      "개인 사진 작업을 실제 굿즈와 커머스 흐름으로 옮기며, 출시 전 MVP에서 확인해야 할 고객·운영 과정을 정리했습니다.",
    question:
      "사진 콘셉트를 사람들이 실제로 보고 고르고 주문할 수 있는 경험으로 만들려면 무엇부터 확인해야 할까?",
    storyArc: [
      "사진 작업을 보여주는 데서 멈추지 않고, 사람들이 실제 제품으로 만났을 때 어떤 경험이 필요한지 확인하고 싶었습니다.",
      "브랜드 콘셉트, 실물 굿즈, 상품 탐색, 장바구니, 주문, 관리자 흐름을 MVP 범위 안에서 연결했습니다.",
      "화면만 만든 프로젝트가 아니라 실물 제품과 운영 흐름을 함께 보면서 출시 전 확인할 지점을 잡았습니다.",
      "아직 공개 시장의 반응은 아닙니다. 지인 대상의 제한적 테스트와 MVP 학습으로만 표현했습니다.",
    ],
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
      "브랜드 이야기, 실물 제품, 주문 흐름, 관리자 확인까지 한 번에 이어보며 작은 서비스의 기본 구조를 잡았습니다.",
    limitations: [
      "현재는 제품 수량보다 고객·운영 흐름의 연결을 중심으로 설명했습니다.",
      "지인 공유, 제품 테스트와 유상 판매는 공개 시장 반응과 구분했습니다.",
      "정식 출시 전이라 고객 반응은 MVP 학습 범위로만 다룹니다.",
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
    category: "연구 설계 · 통계",
    period: "2023년 가을학기",
    role: "팀 프로젝트 · 설문 설계, 데이터 정리, 분석, 시각화 담당",
    summary:
      "혈액형과 MBTI에 대한 익숙한 통념을 101명 설문과 카이제곱 검정으로 확인해본 팀 프로젝트입니다.",
    question:
      "사람들이 자주 말하는 혈액형-성격 이야기는 설문 데이터로 봐도 버틸까?",
    storyArc: [
      "주변에서 쉽게 듣는 이야기를 그냥 믿거나 부정하지 않고, 작은 설문 연구로 확인해보고 싶었습니다.",
      "28문항 설문으로 101명의 응답을 모았고, MBTI 네 차원과 혈액형의 관계를 교차표와 카이제곱 검정으로 봤습니다.",
      "대부분의 차원에서는 유의한 관계가 보이지 않았고, 한 차원의 결과만으로 큰 결론을 내리기 어렵다고 판단했습니다.",
      "표본이 좁고 지인 중심이라, 데이터가 말하는 범위를 넘지 않는 선에서 결론을 제한했습니다.",
    ],
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
      "친숙한 믿음을 가설로 바꾸고, 데이터가 말하는 범위 안에서만 결론을 남기는 연습이었습니다.",
    limitations: [
      "표본이 20대와 팀원 지인에 집중되어 있습니다.",
      "팀 프로젝트라 개인 기여는 설문 설계, 데이터 정리, 분석, 시각화 중심으로만 적었습니다.",
      "p-value 자체보다 관측·기대빈도와 결론의 범위를 중심으로 제시했습니다.",
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
