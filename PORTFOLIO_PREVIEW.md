# 포트폴리오 문구 수정본 이어서 작업하기

수정 브랜치: `codex/portfolio-natural-copy`

## Windows에서 받기

처음 받는 경우:

```powershell
git clone --branch codex/portfolio-natural-copy https://github.com/aquariusmin/abovemin.git
cd abovemin
```

이미 저장소가 있다면 작업 중인 변경을 먼저 저장한 뒤:

```powershell
git fetch origin
git switch codex/portfolio-natural-copy
git pull --ff-only
```

## 로컬 미리보기

Node.js 22.12 이상을 사용합니다. 저장소 루트에서:

```powershell
cd frontend
npm.cmd ci
```

`frontend/.env.local`에 다음을 설정합니다. 기존에 실제 DB 설정이 있으면 URL과 키는 유지하고 `PORTFOLIO_COPY_PREVIEW=1`만 추가합니다.

```dotenv
# DB 없이 포트폴리오 문구만 확인할 때 사용하는 임시 값
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-portfolio-preview
PORTFOLIO_COPY_PREVIEW=1
```

```powershell
npm.cmd run dev
```

브라우저에서 <http://localhost:3000/portfolio/submission>을 엽니다.

이 미리보기 모드는 개발 환경에서만 푸터 게시글 조회와 방문 통계 수집을 건너뜁니다. DB 없이 실행하면 상품·사진 등 DB가 필요한 다른 페이지는 동작하지 않을 수 있습니다. `.env.local`은 Git에 포함하지 않습니다.

## 수정 범위

- 한국어 포트폴리오 소개, 프로젝트 카드, 9개 상세 설명, 인쇄용 요약
- 추상적이거나 반복되는 표현을 줄이고 수행 과정과 결과 중심으로 수정
- 한국어 일반 포트폴리오와 제출용 페이지가 같은 컴포넌트를 사용하므로 양쪽에 반영
- 영어 본문은 수정하지 않음
- 로컬 미리보기의 DB 연결 오류와 통계 스크립트 오류 방지
