// 빌드 중에만 빈 값으로 삼킨다. 런타임엔 던져야 ISR이 마지막으로 성공한 페이지를 계속 내보낸다.
export function buildFallback<T>(fallback: T): (error: unknown) => T {
  return error => {
    if (process.env.NEXT_PHASE === 'phase-production-build') return fallback;
    throw error;
  };
}
