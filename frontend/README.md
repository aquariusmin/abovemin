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

## Archive photo upload

아카이브 사진은 두 가지 방법으로 추가합니다. Cloudinary 콘솔과 Supabase Studio를 오갈 필요는 없습니다.

**1. `/admin` 업로드 위젯** — 앨범을 고르고 사진을 끌어다 놓으면 브라우저가 Cloudinary로 직접 올립니다(서버를 거치지 않으므로 원본 크기 제한이 없습니다). EXIF 촬영일에서 연도가 자동으로 채워지고, 제목/장소를 확인한 뒤 저장하면 `photos` 행이 만들어집니다. 장소와 연도는 일괄 적용 칸으로 한 번에 넣을 수 있습니다.

같은 화면 아래쪽에 그 앨범의 기존 사진이 나열됩니다. 여기서 세 가지를 합니다.

- **정보 수정** — 제목/장소/연도를 고치고 행마다 저장합니다. 바뀐 필드만 서버로 갑니다.
- **순서 변경** — 위/아래 버튼으로 옮긴 뒤 `순서 저장`을 한 번 누릅니다. 서버는 전체 순서를 받아 `sort_order`를 1..n으로 다시 매기며, 같은 요청을 다시 보내도 결과가 같습니다.
- **삭제** — 사이트에서 내립니다. Cloudinary의 원본 파일은 남으므로, 용량 정리는 콘솔에서 따로 합니다.

사진 파일 자체를 교체하는 것은 지원하지 않습니다 — 새로 올리는 쪽을 씁니다.

**2. CLI** — 수십~수백 장을 한 번에 밀어 넣을 때 씁니다.

```bash
npm run photos:add -- --album=korea --location=Seoul --dry-run ./photos/*.jpg
npm run photos:add -- --album=korea --location=Seoul ./photos/*.jpg
```

두 경로 모두 `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`이 필요합니다(`.env.example` 참고). 프로덕션에서 업로드하려면 Vercel 환경변수에도 같은 값을 넣어야 합니다.

저장하지 않고 화면을 떠나면 파일은 Cloudinary에 남되 사이트에는 노출되지 않습니다. 정리는 Cloudinary 콘솔에서 합니다.

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
