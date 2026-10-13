// `import 'server-only'`의 테스트용 대역.
//
// Next는 빌드할 때 이 import를 직접 처리한다: 클라이언트 번들에 끌려 들어오면
// 빌드를 실패시키고, 서버에서는 빈 모듈이다. vitest에는 그 처리가 없으므로
// `vitest.config.mts`가 이 파일로 돌려 준다.
export {};
