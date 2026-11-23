"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ConfirmOptions } from './AdminUi';

/** 저장 안 한 변경이 있으면 beforeunload로 묻는다. 탭 전환은 언마운트가 없어 묻지 않는다. */

export interface UnsavedRegistry {
  set: (key: string, dirty: boolean) => void;
}

const UnsavedGuardContext = createContext<UnsavedRegistry | null>(null);

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

export function useUnsavedGuard(key: string, dirty: boolean): void {
  const registry = useContext(UnsavedGuardContext);
  const fullKey = `${key}:${useId()}`;
  useEffect(() => {
    if (!registry) return;
    registry.set(fullKey, dirty);
    return () => registry.set(fullKey, false);
  }, [registry, fullKey, dirty]);
}

export const DISCARD_CONFIRM: ConfirmOptions = {
  title: '저장하지 않은 변경이 있습니다',
  body: <p>편집 중인 내용을 버리고 계속할까요? 버린 내용은 되돌릴 수 없습니다.</p>,
  confirmLabel: '변경 버리기',
};
