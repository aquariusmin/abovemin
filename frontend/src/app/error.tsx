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
      <div className="glass max-w-md px-8 py-12 md:px-12 text-center space-y-6">
        <p className="eyebrow text-accent">Error</p>
        <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-ink break-keep">
          문제가 발생했습니다.
        </h1>
        <p className="text-sm text-slate break-keep">잠시 후 다시 시도해주세요.</p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary glass-btn">Try again</button>
          <Link href="/" className="btn-outline">홈으로</Link>
        </div>
      </div>
    </div>
  );
}
