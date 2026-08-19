# abovemin portfolio

이 저장소는 이상민의 개인 웹사이트이자 데이터 분석 직무 제출용 포트폴리오입니다. 공개 사이트는 작업물을 많이 나열하는 공간이 아니라, 채용 담당자가 먼저 확인해야 할 대표 분석 사례와 보조 프로젝트를 구분해 보여주는 데 초점을 둡니다.

## Portfolio routes

- `/portfolio/submission`: 한국어 채용 제출용 포트폴리오
- `/portfolio/submission/[slug]`: 제출용 프로젝트 상세 페이지
- `/portfolio/print?mode=submission`: 기업 제출용 PDF 저장 화면
- `/en/portfolio/submission`: 영어 제출용 포트폴리오

## Content strategy

제출용 한국어 포트폴리오는 대표 프로젝트 3개를 먼저 보여줍니다.

1. **Busan Station Dwell Conversion Analysis**
   공개 승하차 데이터에서 원자료에 없는 체류 지표를 만들고, 초기 산식이 음수로 붕괴한 문제를 min-shift 보정으로 수정한 분석입니다.

2. **Telecom Customer Churn Analysis**
   공개 고객 이탈 데이터를 기반으로 고객군, 이탈 위험 신호, 설명 가능한 모델, 유지 전략을 연결한 분석입니다. 5.0%p 감소는 실행 전 목표이지 달성 성과로 표현하지 않습니다.

3. **Satellite GDP Insight**
   야간조도와 GDP의 관계를 대체 경제지표 관점에서 검증한 작업입니다. 기존 연구 주제를 새롭게 발명했다고 주장하지 않고, 직접 문제를 세우고 데이터 정합성을 확인한 과정에 초점을 둡니다.

북극항로, 퀀트 자동매매, 대한항공 재무분석, 수업 과제, 서비스 MVP, 설문 연구는 Explore / Archive 영역에 둡니다. 특히 북극항로는 AI 도움을 받아 낯선 도메인을 탐색한 작업이므로 대표 프로젝트로 앞세우지 않습니다.

## Claim boundaries

이 포트폴리오는 수치의 출처와 해석 범위를 함께 적는 방식을 기본 원칙으로 삼습니다.

- R²는 예측 정확도나 인과관계가 아니라 설명력으로만 표현합니다.
- 백테스트는 실거래 성과가 아니라 과거 데이터 기반 시뮬레이션으로 표현합니다.
- 고객 이탈 감소율은 실제 달성치가 아니라 실험 전 제안 목표로 표현합니다.
- AI 도움을 받은 작업은 대표 프로젝트가 아닌 탐색형 작업으로 낮춰 배치합니다.

## Tech stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase

## Development

```bash
npm ci
npm run dev
npm run build
```

이 프로젝트는 Next.js 최신 버전을 사용합니다. 라우팅, 메타데이터, 정적 경로 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 문서를 먼저 확인합니다.

## Submission checklist

- 대표 프로젝트가 부산 체류 분석, 고객 이탈 XAI, Satellite GDP Insight 순서로 보이는지 확인
- 북극항로가 Explore / Archive 영역에 있는지 확인
- `/portfolio/print?mode=submission`에서 PDF 저장 시 대표 3개가 먼저 나오는지 확인
- 성과처럼 읽힐 수 있는 숫자 옆에 해석 범위가 붙어 있는지 확인
