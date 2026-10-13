---
name: ui-review
description: abovemin의 화면을 DESIGN.md와 모바일 사용성 기준으로 리뷰할 때 쓴다. UI를 고친 뒤의 확인, "디자인 점검", "모바일에서 봐줘", "접근성 확인", "UI 리뷰" 요청에 사용. 코드만 읽지 않고 실제 렌더를 본다.
---

# UI 리뷰

리뷰는 **보고**다. 문제를 찾아 근거와 함께 내고, 고치는 것은 요청받은 범위만 한다. 기존 디자인을 취향으로 바꾸지 않는다.

## 기준의 우선순위

1. `DESIGN.md` — 이 사이트의 색·타이포·컴포넌트 레시피·Do/Don't·반응형. 리뷰 전에 해당 절을 읽는다.
2. `web-design-guidelines` 스킬 — 일반 웹 인터페이스 규칙(접근성, 폼, 포커스, 모션). 실행할 때 최신 규칙을 받아 온다.
3. `vercel-react-best-practices` — 성능에 닿는 구조만. `rerender-*` 규칙과 이미지 로더 권고는 이 사이트에 해당 없다(React Compiler, 커스텀 로더).

1과 2가 어긋나면 1을 따르고, 어긋난다는 사실을 보고에 적는다.

## 순서

1. 바뀐 경로를 정한다(`git diff --name-only main...`로 영향받는 라우트 추리기). 전체 리뷰면: `/`, `/archive`, `/archive/[slug]`, `/archive/[slug]/[id]`, `/shop`, `/shop/[id]`, `/cart`, `/cart/checkout`.
2. `cd frontend && npm run dev`. Playwright MCP 또는 Chrome DevTools MCP로 연다.
3. 폭 네 개에서 스크린샷: **390**(모바일), **768**, **1024**, **1440**. `DESIGN.md`의 브레이크포인트 표와 접는 방식(4→2→1, `lg` 아래 햄버거)을 대조한다.
4. 아래 점검표를 본다.
5. `web-design-guidelines`를 바뀐 파일에 돌린다.

## 점검표

**DESIGN.md 위반 (자주 나오는 것)**
- 스톡 Tailwind 색(`gray-500`, `emerald-400` 등), 순백·순흑 표면
- 밝은 표면 위의 moss 글자(대비 실패)
- 무거운 그림자, 모든 섹션을 카드로 감싼 구성
- 새 컴포넌트 레시피가 `@layer components` 밖에 있음. 새 차트 색이 `src/lib/palette.ts`에 없음
- 잘린 사진(`object-cover`로 프레임에 맞춘 사진) — 프레임이 사진 비율을 따라야 한다

**모바일**
- 가로 스크롤이 생기는지, 긴 한글 제목의 줄바꿈("Line Breaking" 절)
- 터치 타깃: 인접한 탭 대상이 붙어 있지 않은지, 필터 칩과 담기 버튼
- 고정 상단바가 본문을 가리지 않는지, 화면 키보드가 입력과 제출 버튼을 가리지 않는지
- 라이트박스: 스와이프·닫기·뒤로 가기, 사진이 화면을 채우는지

**접근성**
- 키보드만으로 주요 흐름이 되는지, 포커스 링이 보이는지
- 이미지 `alt`, 아이콘 버튼의 이름, 폼 `label`
- `prefers-reduced-motion`에서 리빌·전환이 꺼지는지
- 대비는 `DESIGN.md` "Contrast Notes" 기준(Chrome DevTools의 `a11y-debugging` 스킬)

**상태**
- 빈 목록, 로딩, 오류, 404가 각각 디자인된 화면인지

## 보고 형식

심각도 순으로, 항목마다: 무엇이 / 어느 경로·폭에서 / 근거(`DESIGN.md` 절 또는 규칙) / `파일:줄` / 스크린샷. 보이는 디자인을 바꾸는 제안은 "제안"으로 따로 묶고, 적용 전에 묻는다. 의도된 것(`/about`·`/portfolio` 무링크, Lab의 다른 구조)은 문제로 올리지 않는다.
