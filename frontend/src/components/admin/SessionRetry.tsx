"use client";

import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * 다시 로그인한 뒤 실패한 불러오기를 한 번 더.
 *
 * 세션이 끝난 동안 처음 연 탭은 목록을 401로 받고 "불러오지 못했습니다"를
 * 띄운다. 세션 만료 대화상자(`SessionExpiredDialog`)로 다시 들어오면 그 탭은
 * 스스로 다시 읽어야 한다 — 탭을 닫았다 열거나 새로고침하라고 할 수는 없다
 * (새로고침하면 다른 탭의 초안이 사라진다).
 *
 * `AdminApp`이 다시 로그인할 때마다 세대 번호를 올리고, 각 탭은
 * `useRetryAfterRelogin(실패했는가, 다시 읽기)`를 부른다. **실패한 것만** 다시
 * 읽는다 — 멀쩡히 불러온 목록을 새로 받으면 편집 중인 화면이 흔들린다.
 */

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
