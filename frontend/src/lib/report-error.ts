/**
 * 에러 바운더리가 잡은 에러를 서버로 한 번 보낸다.
 *
 * 실패는 전부 삼킨다. 에러를 보고하다 에러를 내면 바운더리가 다시 돌고,
 * 최악의 경우 루프가 된다. `keepalive`를 쓰는 이유는 사용자가 곧바로 탭을
 * 닫아도 요청이 살아남게 하기 위해서다.
 */
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
    // 여기서 더 할 수 있는 일은 없다.
  }
}
