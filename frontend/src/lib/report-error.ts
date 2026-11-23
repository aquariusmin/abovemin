// 실패는 전부 삼킨다 — 보고 중 에러가 나면 에러 바운더리가 루프에 빠질 수 있다.
export function reportError(
  error: Error & { digest?: string },
  scope: 'page' | 'global' = 'page',
): void {
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        message: String(error?.message ?? error).slice(0, 500),
        digest: error?.digest ?? null,
        path: typeof location !== 'undefined' ? location.pathname : null,
        scope,
      }),
    }).catch(() => {});
  } catch {
  }
}
