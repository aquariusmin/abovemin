/**
 * 조회 실패를 **빌드 중에만** 빈 값으로 삼킨다. `promise.catch(buildFallback([]))`.
 *
 * ISR 페이지에서 조회 오류를 빈 목록으로 바꿔 그리면, 그 "빈 페이지"(또는
 * `notFound()`)가 정상 결과로 캐시에 앉아 revalidate 주기 내내 나간다. 던지면
 * Next는 재생성에 실패한 것으로 보고 **마지막으로 성공한 페이지를 계속 내보낸
 * 뒤** 다음 요청에서 다시 시도한다(Next 문서 ISR § Handling uncaught exceptions).
 *
 * 빌드는 다르다. 프리렌더 중에 던지면 배포 전체가 죽고, 내보낼 "이전 페이지"도
 * 없다. 그때만 빈 값으로 그려 두고, 다음 재생성이 제대로 채우게 한다.
 */
export function buildFallback<T>(fallback: T): (error: unknown) => T {
  return error => {
    if (process.env.NEXT_PHASE === 'phase-production-build') return fallback;
    throw error;
  };
}
