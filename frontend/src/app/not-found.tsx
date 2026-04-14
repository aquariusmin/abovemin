import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] font-serif">
      <div className="text-center space-y-6 px-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-sans">404</p>
        <h2 className="text-3xl font-light italic text-[#333]">페이지를 찾을 수 없습니다.</h2>
        <Link
          href="/"
          className="inline-block px-8 py-3 text-[10px] uppercase tracking-widest text-white bg-[#4A5D4E] font-sans font-bold hover:opacity-90 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
