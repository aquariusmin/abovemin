"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] font-serif">
      <div className="text-center space-y-6 px-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-sans">Error</p>
        <h2 className="text-2xl font-light italic text-[#333]">문제가 발생했습니다.</h2>
        <p className="text-sm text-gray-400 font-sans">잠시 후 다시 시도해주세요.</p>
        <button
          onClick={reset}
          className="px-8 py-3 text-[10px] uppercase tracking-widest text-white bg-[#4A5D4E] font-sans font-bold hover:opacity-90 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
