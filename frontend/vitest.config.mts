import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/lib/__tests__/server-only.stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // `lib/auth`가 모듈 로드 시점에 시크릿을 읽으므로 여기서 먼저 넣는다.
    env: {
      ADMIN_SESSION_SECRET: 'test-secret-at-least-16-chars-long',
      NODE_ENV: 'test',
    },
  },
});
