import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFallback } from '@/lib/build-phase';

describe('buildFallback', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('실행 중에는 다시 던진다 — 빈 결과가 ISR 캐시에 앉지 않게', async () => {
    vi.stubEnv('NEXT_PHASE', '');
    const boom = new Error('db down');
    await expect(Promise.reject(boom).catch(buildFallback([]))).rejects.toBe(boom);
  });

  it('빌드 중에는 빈 값으로 삼킨다 — 배포가 죽지 않게', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await expect(Promise.reject(new Error('db down')).catch(buildFallback([]))).resolves.toEqual([]);
  });
});
