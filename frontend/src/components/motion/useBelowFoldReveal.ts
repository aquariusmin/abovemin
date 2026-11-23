"use client";

import { useInView } from 'framer-motion';
import { useStartsBelowFold } from './useStartsBelowFold';

/** 서버 HTML에서는 모든 타일이 보이고, 하이드레이션 직후 뷰포트 아래에 있는 타일만 숨겼다가 올린다. */
export function useBelowFoldReveal<T extends Element>(amount = 0.15) {
  const { ref, deferred } = useStartsBelowFold<T>();
  const inView = useInView(ref, { once: true, amount });

  return { ref, deferred, hidden: deferred && !inView };
}

/** 숨김은 즉시(화면 밖이라 안 보인다), 등장만 천천히. 움직임 줄이기면 올라오지 않고 불투명도만 바뀐다. */
export function revealTarget(hidden: boolean, reduce: boolean | null, y = 24) {
  if (!hidden) return { opacity: 1, y: 0 };
  return reduce
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, y, transition: { duration: 0 } };
}
