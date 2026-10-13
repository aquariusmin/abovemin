import Link from 'next/link';

/** 404 화면의 본문. 상태 코드에 관한 주의는 `app/not-found.tsx`에 있다. */
export default function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8 bg-canvas">
      <div className="text-center space-y-7">
        <p className="eyebrow text-accent">404</p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink break-keep">
          페이지를 찾을 수 없습니다.
        </h1>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">홈으로 가기</Link>
          <Link href="/archive" className="btn-outline">아카이브</Link>
          <Link href="/shop" className="btn-outline">샵</Link>
        </div>
      </div>
    </div>
  );
}
