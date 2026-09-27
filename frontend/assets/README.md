# assets/

`next/og`(satori)가 읽는 파일들. **브라우저로 내려가지 않는다** — OG 카드를
서버에서 PNG로 그릴 때만 쓰인다. 그래서 `public/`이 아니라 여기에 둔다.

## Fraunces-SemiBold.ttf

사이트의 디스플레이 서체. 워드마크가 세리프인데 OG 카드만 시스템 산세리프로
나오고 있었다 — 링크를 공유했을 때 보이는 첫 화면에서만 브랜드가 달랐다.

`next/font/google`이 받아 두는 것은 woff2인데 satori는 woff2를 읽지 못하므로,
같은 서체의 TTF 인스턴스(weight 600, opsz 축 고정)를 여기 둔다. 출처는 Google
Fonts, 라이선스는 SIL Open Font License 1.1이다.

## IBMPlexSans-Medium.ttf

본문·라벨용. satori에는 **시스템 폰트 폴백이 없다** — `fontFamily`에 적었어도
넘기지 않은 서체는 그냥 무시되고, 넘긴 것 중 하나로 그려진다. Fraunces만
실었더니 아이브로와 태그라인까지 세리프로 나왔다. 사이트의 타입 시스템은
디스플레이만 세리프이므로 두 벌을 다 싣는다.

## 주의

교체하거나 파일을 추가할 일이 생기면 `next.config.ts`의
`outputFileTracingIncludes`에 경로가 걸려 있는지 같이 확인할 것. 그게 없으면
로컬에서는 되는데 배포에서만 파일을 못 찾는다.
