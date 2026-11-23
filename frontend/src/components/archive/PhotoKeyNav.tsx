"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PhotoKeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      // 입력 중인 글자 커서를 옮기려던 화살표를 가로채지 않는다.
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const href = event.key === 'ArrowLeft' ? prevHref : event.key === 'ArrowRight' ? nextHref : null;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, prevHref, nextHref]);

  return null;
}
