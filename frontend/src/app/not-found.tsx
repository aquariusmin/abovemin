import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8 bg-canvas">
      <div className="glass max-w-md px-8 py-12 md:px-12 text-center space-y-7">
        <p className="eyebrow text-accent">404</p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink break-keep">
          페이지를 찾을 수 없습니다.
        </h1>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary glass-btn">Go home</Link>
          <Link href="/archive" className="btn-outline">Archive</Link>
          <Link href="/shop" className="btn-outline">Shop</Link>
        </div>
      </div>
    </div>
  );
}
