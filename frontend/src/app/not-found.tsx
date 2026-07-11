import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-8">
      <div className="text-center space-y-7">
        <p className="eyebrow text-accent">404</p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
          페이지를 찾을 수 없습니다.
        </h1>
        <div className="pt-2">
          <Link href="/" className="btn-primary">Go home</Link>
        </div>
      </div>
    </div>
  );
}
