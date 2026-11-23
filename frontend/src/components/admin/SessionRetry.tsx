"use client";

import { createContext, useContext, useEffect, useRef } from 'react';

/** 재로그인 뒤 실패한 불러오기만 다시 읽는다 — 멀쩡한 목록을 새로 받으면 편집 화면이 흔들린다. */

export const SessionEpochContext = createContext(0);

export function useRetryAfterRelogin(failed: boolean, retry: () => void): void {
  const epoch = useContext(SessionEpochContext);
  const latest = useRef({ failed, retry });
  useEffect(() => {
    latest.current = { failed, retry };
  });

  const seen = useRef(epoch);
  useEffect(() => {
    if (seen.current === epoch) return;
    seen.current = epoch;
    if (latest.current.failed) latest.current.retry();
  }, [epoch]);
}
