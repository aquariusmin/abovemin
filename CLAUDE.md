# abovemin.com

사진가 개인 사이트. 우선순위는 이 순서다 — 충돌하면 위쪽이 이긴다.

1. **Photography** (`/archive`) — 사진 전시와 감상 경험
2. **Shop** (`/shop`, `/cart`) — 인화물·엽서·달력 판매. 계좌이체 + 메일 안내, PG 없음
3. **Portfolio** (`/portfolio`, `/en/portfolio`) — 취업·제출용
4. **Lab** (`/lab`) — 개발 기록

사용자에게 하는 설명은 한국어로 쓴다.

## 저장소

- 앱은 `frontend/`에 있다(Next.js 16 App Router, React 19 + React Compiler, Tailwind 4). 명령은 거기서 실행한다.
- `supabase/migrations/` — 스키마. `scripts/backup/` — 야간 암호화 백업. `.github/workflows/` — CI와 백업.
- **공개 저장소다.** 비밀값, 고객 정보, 백업을 푼 JSON을 커밋하지 않는다.

@frontend/AGENTS.md

## 명령 (`frontend/`에서)

```bash
npm run dev         # 로컬 서버. .env.local은 운영 Supabase·Resend를 가리킨다 — 아래 승인 항목 참고
npm run typecheck
npm run lint
npm test            # vitest, src/lib/__tests__
npm run build       # CI와 같은 마지막 관문. 프리렌더에서만 깨지는 경우가 있다
```

PR을 열기 전에 넷(typecheck, lint, test, build)을 모두 통과시킨다.

## 배포: 브랜치 → PR → 머지

- `main`에 머지하면 곧바로 abovemin.com에 배포된다. **`main`에 직접 푸시하지 않는다**(훅이 막는다).
- `git switch -c <branch>` → 커밋 → `git push -u origin <branch>` → `gh pr create --base main`.
- 머지는 요청받았을 때만, 머지 커밋으로(`gh pr merge --merge`, 스쿼시 아님). 머지 뒤 브랜치를 지우고 실제 사이트가 바뀌었는지 확인한다.
- 푸시 전에 `git branch -vv`로 upstream이 `origin/main`이 아닌지 본다.

## 먼저 승인을 받는 일

- 운영 DB 쓰기: 마이그레이션 적용, `orders`·`products`·`photos`·`albums` 행의 변경과 삭제
- 실제 주문 생성. 로컬 dev 서버도 운영 DB에 쓰고 실제 메일을 보낸다 — 체크아웃 **제출**은 승인 없이 누르지 않는다
- 상품·사진·Cloudinary 자산 삭제
- PR 머지(=배포), Vercel 프로젝트·환경변수·도메인 변경

`orders`에는 이름·이메일·전화·주소가 있다. 조회 결과를 대화나 파일에 필요 이상으로 옮기지 않는다.

## 일부러 그렇게 한 것 — "고치지" 않는다

- **이미지는 `/_next/image`를 거치지 않는다.** 커스텀 로더(`src/lib/image-loader.ts`)가 Cloudinary에 폭과 품질을 직접 넘긴다. 이미지 주소는 `cloudinary()`(`src/lib/cloudinary.ts`)로만 만든다.
- **사진은 자르지 않는다.** `cloudinary()`에 `c_fill`이 없는 것은 의도다. 프레임이 사진 비율을 따른다.
- **아카이브 원본은 대부분 긴 변이 1500px 안팎이다**(일부는 더 크다 — `fl_getinfo`로 확인). 원본보다 큰 폭을 요청해도 선명해지지 않는다. 프레임 크기를 사진에서 재지 말고, 프레임을 먼저 정한다.
- **`/about`과 `/portfolio`는 사이트 어디에서도 링크하지 않는다.** 색인과 sitemap에는 남는다. 링크를 되살리거나 SEO 문제로 다시 꺼내지 않는다.
- **수동 `memo`/`useMemo`/`useCallback`을 넣지 않는다.** React Compiler가 켜져 있다.
- **마이그레이션보다 코드가 먼저 배포될 수 있다.** 새 컬럼을 읽는 코드는 `withColumnFallback`(`src/lib/db-compat.ts`)으로 없는 경우를 견딘다.
- 기존 기능과 디자인은 요청 없이 지우거나 바꾸지 않는다.

## 어디를 읽을까

- UI를 건드리기 전: `DESIGN.md`(색·타이포·컴포넌트 레시피·Do/Don't·반응형). 외부 가이드와 어긋나면 `DESIGN.md`가 이긴다.
- 관리 화면·마이그레이션 순서·업로드·백업: `frontend/README.md`
- 작업별 절차는 스킬에 있다: `photo-delivery`, `shop-flow-check`, `db-change`, `ui-review`, `seo-check`
