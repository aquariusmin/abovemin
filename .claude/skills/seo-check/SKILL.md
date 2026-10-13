---
name: seo-check
description: abovemin의 검색·공유 노출을 점검할 때 쓴다 — 메타데이터, canonical, sitemap, robots, OG 이미지, 구조화 데이터(JSON-LD), hreflang. 새 라우트를 추가했거나 URL 구조를 바꿨을 때, "SEO 점검", "공유 카드 확인", "sitemap 확인" 요청에 사용.
---

# SEO 점검

## 건드리지 않는 것

- **`/about`과 `/portfolio`는 사이트 어디에서도 링크하지 않는다.** 색인과 sitemap에는 남긴다. 내부 링크가 없어 순위가 약한 것은 알고 받아들인 결과다 — 문제로 보고하지 않고, 링크·브레드크럼을 제안하지 않는다. `index` 설정도 그대로 둔다.
- `/admin`, `/api/`는 `public/robots.txt`에서 막는다.

## 한 곳에서 나와야 하는 값

- 정식 주소는 `SITE_URL`(`frontend/src/lib/site.ts`) = `https://www.abovemin.com`. apex는 www로 리다이렉트되므로 canonical·sitemap·RSS·JSON-LD가 apex를 가리키면 안 된다. `grep -rn "abovemin.com" frontend/src frontend/public`으로 손으로 적은 주소를 찾는다.
- `public/robots.txt`는 정적 파일이라 `SITE_URL`을 읽지 못한다. 주소를 바꾸면 같이 고친다.

## 경로별 점검

| 항목 | 볼 것 |
|---|---|
| `title` / `description` | 경로마다 고유한지. 동적 경로는 `generateMetadata`가 데이터에서 만든다 |
| canonical | `alternates.canonical`이 자기 자신(www)을 가리키는지. 필터·정렬 쿼리가 붙은 주소가 canonical이 되지 않는지 |
| hreflang | `/portfolio`(ko) ↔ `/en/portfolio`(en)가 서로를 `alternates.languages`로 가리키는지, 하위 경로까지 |
| OG / Twitter | 사진·앨범·상품은 `cloudinaryOgImage()`로 만든 1200×630 JPG(크롤러는 AVIF를 못 읽는다). 루트와 포트폴리오는 `opengraph-image.tsx` |
| 구조화 데이터 | 상품(`shop/[id]`)의 `Product`/`Offer`: 가격·통화·재고가 화면과 같은지. 품절·초안 상품에 `InStock`이 나가지 않는지 |
| `alt` | 사진의 `alt`가 캡션·장소에서 오는지, 빈 문자열이나 파일명이 아닌지 |
| 상태 코드 | 없는 앨범·사진·상품이 200이 아니라 404인지(soft 404) |

## sitemap

`frontend/src/app/sitemap.ts`는 "200을 내는 주소만 신고한다"는 원칙으로 쓰여 있다. 새 라우트를 더하면 같은 원칙으로 넣는다.

- 빈 앨범, 숨긴 사진, 비공개 앨범, 초안 상품, 미발행 노트는 빠져야 한다 — 해당 페이지가 `notFound()`를 부르는 조건과 같아야 한다.
- `lastModified`는 행의 `updated_at`을 쓴다. 날짜가 없는 항목만 생성 시각.

## 확인 방법

```bash
cd frontend && npm run build && npm run start   # 메타데이터는 프로덕션 빌드로 본다
curl -s localhost:3000/sitemap.xml | grep -c "<loc>"
curl -s localhost:3000/<경로> | grep -oE '<(title|meta|link rel="(canonical|alternate)")[^>]*>'
```

- 빌드 출력의 경로 표에서 정적/동적 표시가 의도와 같은지 본다. 공개 페이지가 뜻밖에 동적이 됐으면 원인을 찾는다.
- 구조화 데이터는 페이지 HTML에서 `application/ld+json` 블록을 꺼내 JSON으로 파싱되는지와 필수 필드를 본다.
- 배포된 사이트는 Chrome DevTools MCP의 Lighthouse SEO 항목으로 본다. 프로덕션에는 조회만 한다.

## 보고

경로별 표(통과/문제)와, 문제마다 실제로 나온 값·기대 값·`파일:줄`. 검색 순위에 대한 추측은 쓰지 않는다 — 확인한 사실만 적는다.
