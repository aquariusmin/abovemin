"use client";

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

/**
 * 루트 레이아웃 자체가 실패했을 때의 마지막 화면.
 *
 * `error.tsx`는 레이아웃 **안에서** 렌더되므로 레이아웃이 무너지면 잡지
 * 못한다. 그 경우 이 파일이 없으면 Next의 기본 화면 — 흰 바탕에 영문
 * 한 줄 — 이 나간다. 사이트에서 유일하게 브랜드가 전혀 없는 화면이 하필
 * 가장 나쁜 순간에 나오는 셈이다.
 *
 * 이 컴포넌트는 `<html>`과 `<body>`를 **직접** 그려야 한다. 루트 레이아웃을
 * 대체하는 자리이기 때문이다. 그래서 폰트 변수도 Tailwind 토큰도 쓸 수 없다 —
 * 그것들을 싣는 레이아웃이 지금 죽어 있다. 색과 서체를 인라인으로 적은 것은
 * 그 때문이지 편의가 아니다. `globals.css`는 레이아웃이 import하므로 여기서는
 * 로드된다는 보장이 없다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, 'global');
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          // 팔레트의 canvas / ink / forest 값을 그대로 적었다.
          background: '#FBF9F4',
          color: '#1C2A21',
          fontFamily: 'Georgia, "Times New Roman", serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#8C4A3A',
            }}
          >
            Error
          </p>
          <h1 style={{ margin: '1rem 0 0', fontSize: 28, fontWeight: 500, wordBreak: 'keep-all' }}>
            사이트를 불러오지 못했습니다.
          </h1>
          <p style={{ margin: '1rem 0 0', fontSize: 14, lineHeight: 1.8, color: '#5A6458', wordBreak: 'keep-all' }}>
            일시적인 오류입니다. 다시 시도해도 같은 화면이면 잠시 후 접속해주세요.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 999,
                border: 'none',
                background: '#2F4A34',
                color: '#FBF9F4',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              다시 시도
            </button>
            {/* `next/link`가 아니라 진짜 `<a>`인 것이 요점이다. 루트
                레이아웃이 무너진 상태에서 클라이언트 내비게이션은 같은 깨진
                트리 안에서 이동하는 것이라 복구가 아니다. 전체 새로고침이어야
                한다. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 999,
                border: '1px solid #D8D3C6',
                color: '#1C2A21',
                fontSize: 14,
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              홈으로
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: '1.5rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                color: '#8B9086',
              }}
            >
              {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
