"use client";

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 마운트 때 요소가 **뷰포트 아래에서 시작했는지**만 잰다. 애니메이션 런타임을
 * 쓰지 않으므로 framer 없는 `Reveal`과 framer를 쓰는 `useBelowFoldReveal`이
 * 함께 쓴다.
 *
 * 서버 HTML과 첫 렌더에서는 `deferred`가 `false` — 모든 것이 보인다. 하이드레이션
 * 직후, 페인트 전에(layout effect) 자기 자리를 재서 뷰포트 아래에 있을 때만
 * `true`가 된다. 그 순간 요소는 화면 밖이므로 숨는 것이 보이지 않고, 첫 화면
 * 안의 요소는 한 번도 숨지 않는다. JS가 없으면 이 효과가 돌지 않으니 그대로
 * 보인다.
 */
export function useStartsBelowFold<T extends Element>() {
  const ref = useRef<T>(null);
  const [deferred, setDeferred] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 레이아웃을 재서 그 결과로 다시 그리는 것은 layout effect의 본래 용도다
    // — 다음 페인트 전에 끝나므로 숨는 순간이 화면에 찍히지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el.getBoundingClientRect().top > window.innerHeight) setDeferred(true);
  }, []);

  return { ref, deferred };
}
