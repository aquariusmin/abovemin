"use client";

import { useLayoutEffect, useRef, useState } from 'react';

/** 서버 HTML과 첫 렌더에서는 `deferred`가 false(모두 보인다). 하이드레이션 직후 뷰포트 아래일 때만 true. */
export function useStartsBelowFold<T extends Element>() {
  const ref = useRef<T>(null);
  const [deferred, setDeferred] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // layout effect: 다음 페인트 전에 끝나므로 숨는 순간이 화면에 찍히지 않는다.
    if (el.getBoundingClientRect().top > window.innerHeight) setDeferred(true);
  }, []);

  return { ref, deferred };
}
