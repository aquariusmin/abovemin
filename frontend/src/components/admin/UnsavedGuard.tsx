"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ConfirmOptions } from './AdminUi';

/**
 * 저장하지 않은 변경 지키기 — 관리 화면 전체에 `beforeunload` 하나.
 *
 * 편집기(노트·상품), 사진 캡션 초안, 업로드 대기 목록이 각자
 * `useUnsavedGuard(이름, 더러운가)`로 알리고, 하나라도 더러우면 새로고침·탭 닫기·
 * 다른 주소로 이동 앞에서 브라우저가 묻는다. 탭 전환은 묻지 않는다 — 숨길 뿐
 * 언마운트하지 않으므로(`AdminApp` 머리 주석) 아무것도 잃지 않는다.
 *
 * 편집기 안에서 닫기·다른 항목 열기는 이 훅이 아니라 각 탭이 `useConfirm`으로
 * 묻는다(`DISCARD_CONFIRM`).
 */

export interface UnsavedRegistry {
  set: (key: string, dirty: boolean) => void;
}

const UnsavedGuardContext = createContext<UnsavedRegistry | null>(null);

/**
 * `AdminApp`이 한 번 부른다. 레지스트리(→ `UnsavedGuardProvider`)와 "지금 더러운
 * 곳이 있는가"(로그아웃 앞에서 묻는다)를 준다.
 */
export function useUnsavedRegistry(): { registry: UnsavedRegistry; hasUnsaved: boolean } {
  const dirtyKeys = useRef(new Set<string>());
  const [count, setCount] = useState(0);

  const registry = useMemo<UnsavedRegistry>(
    () => ({
      set(key, dirty) {
        const keys = dirtyKeys.current;
        if (keys.has(key) === dirty) return;
        if (dirty) keys.add(key);
        else keys.delete(key);
        setCount(keys.size);
      },
    }),
    [],
  );

  useEffect(() => {
    if (count === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 오래된 Chromium은 preventDefault만으로는 묻지 않는다.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [count]);

  return { registry, hasUnsaved: count > 0 };
}

export function UnsavedGuardProvider({ registry, children }: { registry: UnsavedRegistry; children: ReactNode }) {
  return <UnsavedGuardContext.Provider value={registry}>{children}</UnsavedGuardContext.Provider>;
}

/**
 * 이 화면 조각에 저장하지 않은 변경이 있는지 알린다. 언마운트되면 저절로 빠진다.
 * `key`는 디버깅용 이름이다 — 같은 컴포넌트가 여럿 떠도 `useId`로 구분한다.
 */
export function useUnsavedGuard(key: string, dirty: boolean): void {
  const registry = useContext(UnsavedGuardContext);
  const fullKey = `${key}:${useId()}`;
  useEffect(() => {
    if (!registry) return;
    registry.set(fullKey, dirty);
    return () => registry.set(fullKey, false);
  }, [registry, fullKey, dirty]);
}

/** 편집 중인 것을 버리고 닫거나 다른 항목으로 넘어갈 때 묻는 말. */
export const DISCARD_CONFIRM: ConfirmOptions = {
  title: '저장하지 않은 변경이 있습니다',
  body: <p>편집 중인 내용을 버리고 계속할까요? 버린 내용은 되돌릴 수 없습니다.</p>,
  confirmLabel: '변경 버리기',
};
