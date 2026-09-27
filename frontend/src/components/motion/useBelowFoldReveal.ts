"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * 스크롤 등장 애니메이션을 **첫 화면 밖에서 시작한 타일에만** 건다.
 *
 * 예전 방식은 앞의 N장(`ABOVE_FOLD = 3`)만 `initial={false}`로 두고 나머지를
 * opacity 0으로 서버 HTML에 내보냈다. 그리드가 CSS columns라 순서는 열을 따라
 * 위에서 아래로 흐른다 — 3열 데스크톱에서 둘째·셋째 열의 맨 위 타일은 인덱스로
 * 치면 n/3, 2n/3 근처다. 그래서 "앞의 몇 장"을 아무리 늘려도 그 타일들은
 * 하이드레이션을 기다리며 비어 있었다. 몇 장이 첫 화면인지는 열 수·사진 비율·
 * 뷰포트 높이가 함께 정하므로 마크업에서 알 수 없다.
 *
 * 그래서 묻는 방향을 뒤집는다. 서버 HTML에서는 모든 타일이 보인다. 하이드레이션
 * 직후, 페인트 전에(layout effect) 자기 자리를 재서 뷰포트 아래에 있는 타일만
 * 숨기고, 스크롤로 들어올 때 올라온다. 숨기는 순간 그 타일은 화면 밖이므로
 * 사라지는 것이 보이지 않는다. 하이드레이션 전에 이미 스크롤한 사람에게는 그
 * 자리의 타일이 "첫 화면"이 되어 그대로 보인다.
 *
 * - `deferred`: 마운트 때 뷰포트 아래였다 — 등장 애니메이션 대상.
 * - `hidden`: 아직 들어오지 않았다. `animate`를 숨김 상태로 둘 때 쓴다.
 */
export function useBelowFoldReveal<T extends Element>(amount = 0.15) {
  const ref = useRef<T>(null);
  const [deferred, setDeferred] = useState(false);
  const inView = useInView(ref, { once: true, amount });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 레이아웃을 재서 그 결과로 다시 그리는 것은 layout effect의 본래 용도다
    // — 다음 페인트 전에 끝나므로 숨는 순간이 화면에 찍히지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (el.getBoundingClientRect().top > window.innerHeight) setDeferred(true);
  }, []);

  return { ref, deferred, hidden: deferred && !inView };
}

/**
 * `animate`에 그대로 넘길 목표 상태. 숨김은 즉시(그 순간 타일은 화면 밖이라
 * 보이지 않는다), 등장만 컴포넌트의 `transition`을 따라 천천히. 움직임 줄이기면
 * 올라오지 않고 불투명도만 바뀐다.
 */
export function revealTarget(hidden: boolean, reduce: boolean | null, y = 24) {
  if (!hidden) return { opacity: 1, y: 0 };
  return reduce
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, y, transition: { duration: 0 } };
}
