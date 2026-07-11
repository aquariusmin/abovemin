"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-8">
      <div className="text-center space-y-6">
        <p className="eyebrow text-accent">Error</p>
        <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-ink">
          문제가 발생했습니다.
        </h1>
        <p className="text-sm text-slate">잠시 후 다시 시도해주세요.</p>
        <div className="pt-2">
          <button onClick={reset} className="btn-primary">Try again</button>
        </div>
      </div>
    </div>
  );
}
