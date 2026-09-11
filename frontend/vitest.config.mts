import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * 순수 로직만 테스트한다. 컴포넌트 렌더링 테스트는 없다.
 *
 * 이 저장소에서 되돌아오는 버그는 렌더링이 아니라 **계약**에서 났다 — 폼이
 * 보내는 필드와 스키마가 아는 필드가 어긋나고(우편번호), 문자열 파서가 예상
 * 못 한 형태를 만나고, URL 검증이 통과시키지 말아야 할 것을 통과시킨다.
 * 그래서 jsdom도 testing-library도 두지 않는다: node 환경에서 함수만 부른다.
 * 전체 실행이 1초 안쪽이라 커밋 전에 돌리는 데 부담이 없다.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // `lib/auth`는 모듈 로드 시점에 시크릿을 읽는다. 테스트가 import 순서에
    // 따라 갈리지 않도록 여기서 먼저 넣어 준다.
    env: {
      ADMIN_SESSION_SECRET: 'test-secret-at-least-16-chars-long',
      NODE_ENV: 'test',
    },
  },
});
