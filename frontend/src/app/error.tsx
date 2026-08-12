"use client";

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center px-8 bg-canvas">
      <div className="text-center space-y-6">
        <p className="eyebrow text-brick">Error</p>
        <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-[-0.01em] text-ink break-keep">
          페이지를 불러오지 못했습니다.
        </h1>
        <p className="text-sm text-slate break-keep">
          연결이 끊겼거나 일시적인 오류입니다. 다시 시도해도 같은 화면이면 잠시 후 접속해주세요.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">다시 시도</button>
          <Link href="/" className="btn-outline">홈으로</Link>
        </div>
      </div>
    </div>
  );
}
