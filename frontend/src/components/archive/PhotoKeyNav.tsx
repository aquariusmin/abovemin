"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 사진 페이지의 ←/→: 앨범 안의 이전/다음 사진으로. 라이트박스와 같은 키다.
 *
 * 아무것도 그리지 않는다. 링크 자체는 서버가 그린 `<Link>`에 있고(키보드가
 * 없어도, JS가 없어도 넘어간다), 이 컴포넌트는 단축키만 더한다.
 */
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
