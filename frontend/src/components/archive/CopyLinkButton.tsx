"use client";

import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

/**
 * 사진 페이지의 "링크 복사". 라이트박스의 같은 버튼과 문구·동작을 맞춘다.
 *
 * 경로만 받고 origin은 누르는 순간 붙인다 — 서버가 아는 정식 주소를 굽으면
 * 미리보기 배포에서 복사한 링크가 프로덕션을 가리킨다.
 */
export default function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    const ok = await copyToClipboard(`${window.location.origin}${path}`);
    setState(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="btn-outline gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          {state === 'copied' ? (
            <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.6.6M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.6-.6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        {state === 'copied' ? '복사됨' : state === 'failed' ? '복사하지 못했어요' : '링크 복사'}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? '사진 링크를 복사했습니다.' : state === 'failed' ? '링크를 복사하지 못했습니다. 주소창의 주소를 사용해 주세요.' : ''}
      </span>
    </>
  );
}
