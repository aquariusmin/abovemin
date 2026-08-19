import type { PortfolioProject } from "@/data/portfolio";

export const koreanPortfolioProjects: PortfolioProject[] = [
  {
    slug: "arctic-route",
    number: "01",
    title: "Arctic Route Accessibility Analysis",
    category: "기후 데이터 · 물류 전략",
    period: "2026년 7월",
    role: "개인 프로젝트 · 극지 빅데이터 분석 과제",
    sourceUrl: "https://github.com/aquariusmin/arctic-route-accessibility-analysis",
    summary:
      "NSIDC 위성 해빙 관측(1979~2025)으로 북극항로가 한 해에 몇 달이나 열려 있는지 계산하고, 부산–로테르담 구간의 절감 거리까지 정리했습니다.",
    question:
      "해빙 감소는 항로가 실제로 열려 있는 기간을 얼마나 바꿨고, 그 결과는 한국 화주에게 어떤 선택지로 남는가?",
    storyArc: [
      "‘얼음이 줄었다’는 서술을 운항 판단에 쓸 수 있는 단위로 바꾸는 일부터 시작했습니다. 목표 지표를 연간 통항 가능 개월수로 정했습니다.",
      "대권항로에 50km 버퍼 회랑을 씌워 해빙 격자 위에 올리고, 구간별 평균 해빙농도와 95퍼센타일 병목값을 계산했습니다.",
      "추세는 OLS 하나로 보고하지 않았습니다. Theil-Sen 강건회귀를 함께 돌려 두 방법의 부호가 일치할 때만 결과로 인정했습니다.",
      "그래서 남은 결론은 ‘북극이 따뜻해졌다’가 아니라, 1A/PC7급 기준 연 3.4개월이 열렸고 북극점 통과 항로는 여전히 0개월이라는 문장입니다.",
    ],
    evidence: [
      "NSIDC Sea Ice Index v4 월별 해빙농도 격자 25km · 1979~2025년",
      "SHA-256 체크섬을 기록한 데이터 매니페스트와 멱등 수집 스크립트",
      "격자 산출 해빙면적과 NSIDC 공식 통계의 교차검증, 50km 버퍼 민감도 분석",
      "OLS와 Theil-Sen 추세를 함께 기록한 CSV 산출물과 약 30개 테스트",
    ],
    tools: ["Python", "pandas", "NumPy", "rasterio", "GeoPandas", "SciPy", "statsmodels", "pytest"],
    process: [
      {
        title: "데이터 출처 고정",
        description:
          "NSIDC 격자 GeoTIFF를 수집하고 SHA-256 체크섬 매니페스트로 출처를 고정한 뒤, 공식 해빙면적 통계와 대조해 격자 산출값이 어긋나지 않는지 확인했습니다.",
      },
      {
        title: "항로 회랑 구성",
        description:
          "북극항로(NSR), 북서항로, 북극점 통과 항로의 대권 경로에 50km 버퍼를 적용해 격자에 투영하고, 병목 탐지를 위해 구간별로 나눴습니다.",
      },
      {
        title: "통항 가능성 산출",
        description:
          "선급별 해빙농도 임계값을 적용해 연·월 단위 통항 가능 여부와 병목 구간을 판정하고, 연간 통항 가능 개월수로 집계했습니다.",
      },
      {
        title: "추세 검증과 시나리오 해석",
        description:
          "OLS와 Theil-Sen을 병행해 두 방법이 일치하는 추세만 보고하고, 수에즈 대비 거리 절감을 물류·크루즈 두 시나리오로 정리했습니다.",
      },
    ],
    insights: [
      "ice-1A/PC7급 기준 NSR 통항 가능 기간은 1980년대 연 0개월에서 2015년 이후 연 3.4개월로 늘었습니다. 10년당 +0.9개월이며 OLS와 Theil-Sen이 같은 방향을 가리켰습니다.",
      "9월 회랑 평균 해빙농도는 10년당 3.2% 감소했습니다.",
      "NSR은 부산–로테르담 기준 수에즈 대비 3,151해리, 약 29.8% 짧습니다.",
      "반면 북극점을 지나는 항로는 거리로 가장 짧지만 전 기간에 걸쳐 통항 가능 개월수가 0이었습니다. 짧다고 쓸 수 있는 길은 아니었습니다.",
    ],
    decisionValue:
      "연간 통항 가능 개월수와 절감 해리라는 두 숫자로 정리해, ‘언제부터 몇 달간 쓸 수 있는 항로인가’를 바로 비교할 수 있게 했습니다.",
    limitations: [
      "관측 자료 기반 분석이며 미래 해빙을 예측하는 기후 모형이 아닙니다.",
      "통항 가능 판정은 해빙농도 임계값 기준이며 보험, 항만, 쇄빙선 지원, 규제 같은 운항 제약은 포함하지 않았습니다.",
      "확장 분석(Phase E)의 일부 리스크·비용 레이어는 실데이터를 확보하지 못해 합성 대체값을 사용했고, 코드에서 명시적으로 구분했습니다.",
    ],
    suggestedVisuals: [
      "연도별 통항 가능 개월수 추이",
      "9월 회랑 해빙농도 OLS · Theil-Sen 추세",
      "NSR 병목 구간 비교",
      "수에즈 대비 거리 절감 요약",
    ],
    caution:
      "통항 가능 개월수는 해빙농도 임계값으로 판정한 물리적 접근성이며, 실제 상업 운항이 가능하다는 뜻이 아닙니다.",
  },
  {
    slug: "busan-station-dwell",
    number: "02",
    title: "Busan Station Dwell Conversion Analysis",
    category: "공공데이터 · 도시 정책",
    period: "2026년 8월 (진행 중)",
    role: "개인 프로젝트 · 2026년 Big Data 활용 대회 출품 준비",
    sourceUrl: "https://github.com/aquariusmin/busan-station-dwell",
    summary:
      "부산 도시철도 승하차 기록만으로 원자료에 없는 ‘체류’를 추정해, 하차는 많지만 머물지 않는 역을 찾아냈습니다.",
    question:
      "이용객 수로 상권 정책 대상지를 고르면 무엇을 놓치는가? 하차와 체류는 같은 말인가?",
    storyArc: [
      "정책은 승하차 인원으로 대상지를 고르지만, 하차는 ‘도착’일 뿐 ‘체류’가 아닙니다. 그런데 체류는 공개 통계에 없는 변수였습니다.",
      "누적하차에서 누적승차를 빼면 철도로 들어와 아직 나가지 않은 인원이 남습니다. 이 곡선의 면적을 Little's Law로 환산해 평균 체류시간을 만들었습니다.",
      "처음 만든 지표는 주거지형 역에서 무너졌습니다. 역-일 조합의 86.7%가 음수였고, 평균 체류시간이 −1.23시간이라는 불가능한 값이 나왔습니다.",
      "일별 최저점 기준으로 곡선을 이동시키자 값이 정상화됐고, 보정 과정에서 최저점과 정점의 선후만으로 유입형·주거형 역이 갈린다는 부수 결과까지 얻었습니다.",
    ],
    evidence: [
      "부산교통공사 시간대별 승하차인원 40,544행 · 2026년 1~6월 · 112개 역",
      "시스템 전체 일별 승·하차 격차 최대 0.748% — 개찰구 기반 데이터임을 확인한 전제 검증",
      "도시철도역사정보(위·경도)와 역사 건축현황을 결합한 역 단위 KPI 테이블",
      "숙박 가설 검증을 위한 요일별·시간대별 승차 프로파일",
    ],
    tools: ["Python", "pandas", "NumPy", "공공데이터포털", "Little's Law"],
    process: [
      {
        title: "전제 검증",
        description:
          "승차 합계와 하차 합계의 시스템 전체 격차를 계산해, 데이터가 개찰구 통과 기록이며 노선 간 내부 환승이 기록되지 않는다는 전제를 먼저 확인했습니다.",
      },
      {
        title: "체류 지표 설계",
        description:
          "누적하차에서 누적승차를 뺀 순체류인구(NRP)를 만들고, 곡선 면적을 일일 하차량으로 나눠 평균 체류시간을 유도했습니다.",
      },
      {
        title: "결함 발견과 보정",
        description:
          "주거지형 역에서 지표가 음수로 붕괴하는 것을 확인하고, 일별 최저점 기준 min-shift로 철도 기인 체류의 순증분만 남겼습니다.",
      },
      {
        title: "대안 가설 검증",
        description:
          "해운대역의 낮은 체류를 숙박업소 밀집으로 설명할 수 있는지 체크아웃 지수로 검증하고, 설명력이 부족하다는 결론까지 기록했습니다.",
      },
    ],
    insights: [
      "min-shift 보정 후 비환승역 평균 체류시간은 −1.23시간에서 2.78시간으로 정상화됐습니다.",
      "최저점과 정점의 선후만으로 유입형 49개 역과 주거형 63개 역이 자동 분류됐습니다.",
      "해운대역 평균 체류는 0.96시간으로 유입형 49개 역 중 최하위입니다. 중앙값은 2.09시간이며, 하차량 순위와 체류 순위가 가장 크게 어긋나는 사례입니다.",
      "‘숙박업소가 많아서’라는 대안 설명은 일요일 체크아웃 지수 2.72로 신호 자체는 확인됐지만, 규모가 유입의 5.8%에 그쳐 낮은 체류전환율을 설명하지 못했습니다.",
    ],
    decisionValue:
      "이용객 수 대신 체류 전환 실패 구간을 기준으로 삼으면 상권 재생 예산의 대상지 명단이 달라집니다. 그 명단을 만드는 것이 이 분석의 목적입니다.",
    limitations: [
      "대회 제출(2026년 9월)을 앞둔 진행 중 과제이며, 현재 수치는 1차 검증 단계의 결과입니다.",
      "상가(상권)정보 결합과 회귀 잔차 진단이 남아 있어, 상업 공급 대비 체류가 부족한 역을 특정하는 단계에는 이르지 못했습니다.",
      "NRP는 철도로 유입된 체류의 대리지표이며, 버스·자가용으로 들어온 인원은 포함하지 않습니다.",
      "역사정보 114개 중 112개만 승하차 데이터에 존재해 2개 역이 분석에서 빠져 있습니다.",
    ],
    suggestedVisuals: [
      "시간대별 NRP 곡선과 min-shift 보정 전후 비교",
      "하차량 순위 대 체류 순위 산점도",
      "유입형 · 주거형 역 분류 지도",
      "해운대역 요일별 시간대 승차 프로파일",
    ],
    caution:
      "체류 인구와 체류시간은 승하차 기록에서 추정한 값이며, 통신·카드 기반 유동인구 실측치가 아닙니다.",
  },
  {
    slug: "telecom-churn",
    number: "03",
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
          "7개 분류모형을 비교해 ROC-AUC가 가장 높았던 Gradient Boosting을 최종 모형으로 선택한 뒤, SHAP과 dependence 분석으로 주요 요인을 해석했습니다.",
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
      "Gradient Boosting의 테스트셋 ROC-AUC는 0.841입니다. 저장소의 reproduce.py를 실행하면 같은 지표표가 다시 나옵니다.",
    ],
    decisionValue:
      "예측 점수 자체보다 어떤 고객군부터 챙길지 정리한 데 의미를 뒀습니다. 5.0%p 감소는 실행 전 목표라 실제 성과처럼 쓰지 않았습니다.",
    limitations: [
      "공개 데이터에는 캠페인 노출, 민원 이력, 개입 비용, 실제 고객 유지 결과가 포함되어 있지 않습니다.",
      "성능 수치는 라이브러리 버전에 따라 소수 셋째 자리에서 달라질 수 있어, 재현 스크립트가 출력한 값을 기준으로 씁니다.",
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
    number: "04",
    title: "Satellite GDP Insight",
    category: "경제 데이터 · 대체 지표 검증",
    period: "2025년 봄학기",
    role: "개인 프로젝트",
    sourceUrl: "https://github.com/aquariusmin/Satellite-GDP-Insight",
    summary:
      "야간 위성 조도와 World Bank 지표를 국가·연도 단위로 맞춰, 밤의 밝기가 GDP의 보조 지표로 어디까지 유효한지 검증했습니다.",
    question:
      "공식 통계가 부족하거나 늦게 나올 때, 야간조도는 경제활동을 읽는 보조 지표로 어디까지 쓸 수 있을까?",
    storyArc: [
      "북한의 야간 위성사진처럼 공식 통계가 부족한 지역에서도 경제활동의 흔적을 볼 수 있지 않을까 하는 문제의식에서 시작했습니다.",
      "VIIRS 야간조도와 World Bank의 GDP·인구·도시화·전력 접근성 지표를 2019~2023년 국가·연도 단위로 맞췄습니다.",
      "단순 회귀의 R²는 0.819로 재현됐지만, 도시인구·전력 접근성 조절항의 추가 설명력은 작았습니다. 밝기 하나로 경제를 충분히 읽을 수 있다는 뜻은 아니었습니다.",
      "이 프로젝트의 결론은 새로운 예측모형이 아니라, 야간조도를 경제 보조 지표로 쓸 때 필요한 데이터 정합성 점검과 해석 범위입니다.",
    ],
    evidence: [
      "VIIRS 야간조도와 World Bank의 GDP, 인구, 도시인구, 전력 접근성 지표",
      "분석 기간 2019~2023년 · 164개국 · 병합 후 820개 국가-연도 관측치",
      "GDP 사용 가능 관측치 791개 기준 단순 회귀 R² = 0.819",
      "저장소에 있던 스프레드시트의 밝기 열 어긋남을 확인하고, SPSS 분석 파일과 reproduce.py 기준값을 분리해 기록",
    ],
    tools: ["Python", "SPSS", "Excel", "Regression", "Data QA"],
    process: [
      {
        title: "문제의식 설정",
        description:
          "공식 GDP가 늦거나 제한적인 지역에서 대체 신호가 필요하다는 질문을 먼저 세우고, 야간조도를 후보 지표로 잡았습니다.",
      },
      {
        title: "국가·연도 데이터 통합",
        description:
          "VIIRS 밝기 데이터와 World Bank 경제지표를 국가명과 연도 기준으로 맞춰 2019~2023년 패널 형태의 분석 테이블을 만들었습니다.",
      },
      {
        title: "회귀와 조절효과 검정",
        description:
          "분포가 치우친 변수에는 로그 변환을 적용하고, 도시인구·전력 접근성 조절항을 추가해 관계가 조건에 따라 달라지는지 확인했습니다.",
      },
      {
        title: "데이터 정합성 수정",
        description:
          "보고서와 함께 있던 xlsx의 밝기 열이 어긋난 것을 확인해 산점도 주장은 제외하고, SPSS 분석 파일과 reproduce.py로 재현되는 값만 남겼습니다.",
      },
    ],
    insights: [
      "단순 회귀모형에서 야간조도는 GDP 변동의 81.9%를 설명했습니다(R² = 0.819, N = 791). 저장소의 reproduce.py로 재현됩니다.",
      "도시인구와 전력 접근성 조절항을 추가해도 설명력 증가는 작았습니다. 따라서 핵심은 복잡한 모형보다 기본 관계와 데이터 품질 확인에 있었습니다.",
      "함께 있던 xlsx에서는 밝기 열이 어긋나 더 높은 R²처럼 읽힐 수 있었고, 이 값을 사용하지 않도록 저장소에 경고를 명시했습니다.",
      "이 결과는 설명적 관계이며 예측 정확도, 인과관계, 공식 GDP 대체 가능성의 증거로 해석하지 않습니다.",
    ],
    decisionValue:
      "야간조도는 공식 통계를 대체하기보다, 국가·지역을 1차로 스크리닝하거나 통계 공백 구간의 변화를 모니터링하는 보조 신호로 쓸 수 있습니다.",
    limitations: [
      "973·820·791은 데이터 처리 단계가 다르므로 하나의 표본 크기처럼 섞어 쓰지 않았습니다.",
      "야간조도와 GDP의 관계는 이미 알려진 연구 주제입니다. 이 프로젝트의 초점은 새로운 학술 기여가 아니라 직접 문제를 세우고 데이터 정합성을 검증한 과정입니다.",
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
      "R² = 0.819는 단순 회귀모형의 설명력을 뜻합니다. 이를 81.9%의 예측 정확도로 표현하지 않습니다.",
  },
  {
    slug: "korean-air",
    number: "05",
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
    number: "06",
    title: "Quant Trading Automation",
    category: "핀테크 · 전략 검증과 운영",
    period: "2025년~현재",
    role: "개인 프로젝트 · tqt(토스 Open API) · Quant Trading Fleet",
    sourceUrl: "https://github.com/aquariusmin/toss-api-quant-trading",
    summary:
      "전략을 새로 만드는 일보다, 그 전략에 우위가 있는지 검증하고 안전하게 켜고 끄고 기록하는 데 시간을 더 썼습니다. tqt가 검증과 실행을, Fleet이 운영 대시보드를 맡습니다.",
    question:
      "매매 규칙을 서비스처럼 운영하려면 전략 코드 말고 무엇이 더 필요하고, 그 전략이 우위가 있다는 건 어떻게 확인하는가?",
    storyArc: [
      "처음 문제의식은 단순했습니다. 전략이 맞는지 보기 전에, 그 전략을 안전하게 켜고 끄고 지켜볼 수 있어야 했습니다.",
      "Fleet에서 브로커 인터페이스, 봇 상태, 설정값, 주문 이력, 로그를 한 흐름으로 묶고 FastAPI와 대시보드로 제어했습니다.",
      "다음 질문은 ‘그래서 이 전략에 우위가 있는가’였습니다. tqt에서는 인샘플 성과 대신 walk-forward 아웃오브샘플로만 결과를 보고하도록 백테스트를 다시 설계했습니다.",
      "그 결과 가장 좋은 전략도 매수보유보다 CAGR이 낮다는 사실을 먼저 적게 됐습니다. 두 프로젝트 모두 페이퍼 트레이딩 단계이며 수익률을 주장하지 않습니다.",
    ],
    evidence: [
      "국내상장 글로벌 ETF 8종과 국고채 2종, 2011~2026년 일봉 백테스트",
      "계좌의 실제 수수료율(API 조회), 슬리피지 10bp, 익일 시가 체결을 반영한 비용 가정",
      "walk-forward 아웃오브샘플(5년 학습 · 2년 검증) 성과표와 파라미터 민감도 스윕",
      "KIS와 Binance/CCXT broker interface, 봇 상태·전략 설정·주문 이력·로그",
    ],
    tools: ["Python", "pandas", "FastAPI", "React", "TypeScript", "SQLite", "SQLAlchemy", "Docker", "Toss Open API"],
    process: [
      {
        title: "전략과 broker 로직 분리",
        description:
          "거래소별 데이터와 주문 처리 차이를 분리하기 위해 브로커 추상화 계층을 설계했습니다.",
      },
      {
        title: "상태와 이력의 가시화",
        description:
          "봇 상태, 설정, 실행 이력과 운영 로그를 저장하고 FastAPI 서비스와 React 대시보드로 제어했습니다.",
      },
      {
        title: "비용을 실측한 백테스트",
        description:
          "추정 수수료 대신 계좌의 실제 요율을 API에서 읽어오고, 슬리피지와 익일 시가 체결을 반영해 비용 가정을 실제에 맞췄습니다.",
      },
      {
        title: "아웃오브샘플 검증과 페이퍼 트레이딩",
        description:
          "5년 학습 · 2년 검증 walk-forward로만 성과를 보고하고, 실제 호가창에 체결시키는 페이퍼 트레이딩으로 운영을 검증했습니다.",
      },
    ],
    insights: [
      "walk-forward 아웃오브샘플에서 Faber 이동평균은 CAGR 7.36%, Sharpe 1.01, 최대낙폭 −14.1%였고 decay는 ×1.28이었습니다. 인샘플보다 성과가 낮아지지 않아 과최적화 흔적은 확인되지 않았습니다.",
      "다만 매수보유가 CAGR로는 더 높습니다(8.94%). 전술적 배분이 사는 것은 수익률이 아니라 낙폭입니다. 최대낙폭 −20.1%가 −14.5%로 줄어듭니다.",
      "토스 Open API는 1분봉을 약 4일치만 제공합니다. 인트라데이 전략은 백테스트 자체가 불가능해, 저빈도 일봉 전략은 취향이 아니라 제약에서 나온 선택입니다.",
      "자동매매는 전략 개발뿐 아니라 운영 설계의 문제입니다. 상태 확인, 로그, 파라미터 관리, 킬 스위치, 복구 절차가 함께 있어야 켜둘 수 있습니다.",
    ],
    decisionValue:
      "수익률을 주장하는 대신, 어떤 조건에서 전략을 켤 수 있고 무엇을 보면 꺼야 하는지를 숫자와 운영 장치로 정리했습니다.",
    limitations: [
      "두 프로젝트 모두 페이퍼 트레이딩 검증 단계이며 실자금 운용 이력이 없습니다.",
      "백테스트 유니버스가 현재 상장된 종목으로 구성돼 생존 편향이 일부 남아 있습니다.",
      "2022년에는 검증한 전략 대부분이 손실이었습니다. 주식과 장기채가 함께 빠지는 구간은 이 설계로 방어되지 않습니다.",
      "장시간 가동, 주문 실패 처리, 재시작 시나리오는 별도 운영 기준으로 관리해야 합니다.",
    ],
    suggestedVisuals: [
      "walk-forward 인샘플 대 아웃오브샘플 비교",
      "전략별 CAGR과 최대낙폭 교환관계",
      "전략부터 대시보드까지의 시스템 구조",
      "모의투자로 표시한 익명화 대시보드",
    ],
    caution:
      "페이퍼 트레이딩 검증 단계입니다. 백테스트 수치는 과거 데이터 기반 시뮬레이션이며, 실거래 운영·수익률·승률·자본 증가를 주장하지 않습니다.",
  },
  {
    slug: "financial-ai-model-study",
    number: "07",
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
    number: "08",
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
    number: "09",
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

export const koreanSubmissionFeaturedSlugs = [
  "busan-station-dwell",
  "telecom-churn",
  "satellite-gdp",
] as const;

export const koreanSubmissionArchiveSlugs = [
  "arctic-route",
  "quant-trading-fleet",
  "korean-air",
  "financial-ai-model-study",
  "phorage",
  "blood-type-survey",
] as const;

function getSubmissionProjectsBySlugs(slugs: readonly string[], prefix = "") {
  return slugs.flatMap((slug, index) => {
    const project = getKoreanPortfolioProject(slug);
    if (!project) return [];
    return [{
      ...project,
      number: `${prefix}${String(index + 1).padStart(2, "0")}`,
    }];
  });
}

export function getKoreanSubmissionFeaturedProjects() {
  return getSubmissionProjectsBySlugs(koreanSubmissionFeaturedSlugs);
}

export function getKoreanSubmissionArchiveProjects() {
  return getSubmissionProjectsBySlugs(koreanSubmissionArchiveSlugs, "A");
}

export function getKoreanSubmissionPortfolioProjects() {
  return [
    ...getKoreanSubmissionFeaturedProjects(),
    ...getKoreanSubmissionArchiveProjects(),
  ];
}

export function getKoreanSubmissionPortfolioProject(slug: string) {
  return getKoreanSubmissionPortfolioProjects().find((project) => project.slug === slug);
}
