---
name: photo-delivery
description: abovemin의 사진 전달(Cloudinary 변환, next/image 로더, sizes, 히어로 LCP, 플레이스홀더, 워터마크)을 고치거나 점검할 때 쓴다. 사진이 흐리다/느리다/밀린다(CLS), 이미지 품질과 용량의 균형, 새 이미지 컴포넌트 추가, LCP 측정 요청에 사용.
---

# 사진 전달

목표는 하나다: **사진이 올린 그대로 보이되, 화면에 필요한 만큼만 내려받는다.** 화질과 속도가 부딪히면 감상 화면(라이트박스, 사진 페이지, 홈 히어로)은 화질을, 목록(그리드, 썸네일)은 속도를 택한다.

## 이 사이트의 파이프라인

1. 호출부가 `cloudinary(url, { width, watermark })`(`frontend/src/lib/cloudinary.ts`)로 주소를 만든다. `width`는 그 자리에서 필요한 **최대** 폭이다.
2. `next/image`가 srcset 후보마다 전역 로더(`src/lib/image-loader.ts`)를 부르고, 로더는 `cloudinaryResize`로 `f_auto,q_…,c_limit,w_<후보폭>`을 맨 앞에 다시 붙인다. `/_next/image`는 거치지 않는다.
3. 후보 폭은 호출부의 `w_N`을 넘지 않는다. `dpr_auto`는 버린다(srcset의 `w` 서술자와 겹치면 레티나에서 두 번 곱해진다).
4. 워터마크처럼 전달 최적화가 아닌 세그먼트는 순서 그대로 남는다. 줄인 **뒤에** 오버레이가 얹힌다.

## 지킬 것

- 이미지 주소를 손으로 조립하지 않는다. `cloudinary()` / `cloudinaryPlaceholder()` / `cloudinaryOgImage()` / `withWatermark()`를 쓴다.
- 자르는 변환(`c_fill`, `c_crop`, `g_auto`)을 넣지 않는다. 프레임이 사진 비율을 따른다(`DESIGN.md` "Image Treatment").
- `quality`는 `next.config.ts`의 `images.qualities`(`[75, 90]`) 안에서만 쓴다. 생략하면 `q_auto`. 지금 90은 홈 히어로뿐이다 — 늘리려면 이유가 있어야 한다.
- 공개 사진에는 `watermark: true`를 유지한다. 관리 화면 썸네일과 32px 플레이스홀더에는 싣지 않는다.
- 새 원격 호스트는 `images.remotePatterns`, `isRenderableImageUrl`, CSP `img-src`(모두 `next.config.ts`/`cloudinary.ts`) 세 곳을 같이 고친다.
- **원본 상한**: 아카이브 원본은 대부분 긴 변 1500px 안팎이다(일부는 더 크다). `width`를 올려도 선명해지지 않고, `c_limit`은 확대하지 않는다. 큰 화면의 흐림은 코드가 아니라 재업로드로 푼다. 원본 크기는 이렇게 확인한다:
  `curl -s "https://res.cloudinary.com/dmljaqqzc/image/upload/fl_getinfo/<경로>"` → `input.width × input.height`

## 새 이미지를 놓을 때

| 항목 | 기준 |
|---|---|
| `width` | 그 자리의 최대 CSS 폭 × 2(레티나), 원본 상한 이하. 현재 관례: 썸네일 160–240, 카드 600–800, 큰 보기 1600 |
| `sizes` | 실제 레이아웃 폭과 맞춘다. 틀리면 3열 그리드가 전폭 이미지를 받는다. 브레이크포인트는 `DESIGN.md` "Responsive Behavior" |
| 자리 예약 | 저장된 `width/height` 또는 `aspect-ratio`로 프레임을 먼저 잡는다. 사진에서 프레임 크기를 재지 않는다 |
| 첫 화면 | 경로당 LCP 이미지 하나에만 `priority`. 나머지는 지연 로드 |
| 로딩 중 | `cloudinaryPlaceholder()`를 프레임 배경으로. 모양은 프레임이 정하고 배경은 색만 채운다 |

## 확인

1. `cd frontend && npm test -- cloudinary image-loader` — URL 재작성 규칙은 테스트로 잠겨 있다.
2. `npm run dev` 후 Chrome DevTools MCP로 측정한다(스킬 `chrome-devtools-mcp:debug-optimize-lcp`).
   - 모바일(390×844, DPR 3)과 데스크톱(1440) 둘 다.
   - 네트워크 요청에서 이미지별 **요청 폭 대 렌더 폭**을 본다. 렌더 폭 × DPR보다 훨씬 크면 `sizes`가 틀린 것이고, 작으면 흐리다.
   - LCP 요소가 의도한 그 이미지인지, `fetchpriority=high`로 일찍 요청되는지, CLS가 0에 가까운지.
3. 바꾸기 전과 후의 수치(LCP, 전송 바이트, 요청 폭)를 같이 보고한다. 수치 없이 "빨라졌다"고 하지 않는다.
4. 화질은 숫자로 안 보인다. 감상 화면을 건드렸으면 같은 사진의 전후 스크린샷을 100%로 비교해 보여준다.
