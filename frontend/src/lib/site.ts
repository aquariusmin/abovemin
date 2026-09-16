/**
 * 사이트의 정식 주소.
 *
 * 프로덕션은 `www.abovemin.com`에서 서빙되고, apex(`abovemin.com`)는 www로
 * 307 리다이렉트된다. 그런데 `metadataBase`·sitemap·RSS·robots·JSON-LD가
 * 전부 apex를 적고 있어서, 모든 canonical이 **리다이렉트되는 주소**를
 * 가리키고 있었다. canonical이 다른 곳으로 넘어가는 URL이면 검색엔진은 그
 * 신호를 믿지 않는다.
 *
 * 여러 파일에 따로 적혀 있던 것이 어긋난 원인이라 한 곳으로 모은다.
 * `public/robots.txt`는 정적 파일이라 이 값을 읽지 못한다 — 바꿀 때 같이 고친다.
 */
export const SITE_URL = 'https://www.abovemin.com';
