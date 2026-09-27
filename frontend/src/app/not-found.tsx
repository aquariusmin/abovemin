import Link from 'next/link';

/**
 * 이 페이지가 **404 상태 코드와 함께** 나가려면 루트에 `loading.tsx`가 없어야
 * 한다.
 *
 * 루트 `loading.tsx`는 스트리밍 경계를 만든다. 경계가 있으면 Next는 페이지가
 * 풀리기 전에 셸과 로딩 UI를 먼저 흘려보내는데, 그 순간 응답 헤더가 200으로
 * 확정된다. 뒤늦게 `notFound()`가 던져져도 본문만 이 화면으로 바뀔 뿐 상태
 * 코드는 바꿀 수 없다 — `/archive/<없는앨범>`, `/shop/9999`, `/lab/bot/<오타>`가
 * 전부 200을 반환하고 있었다(soft-404). 검색엔진에게는 "그 URL은 정상 페이지"
 * 라는 뜻이라, 존재하지 않는 주소가 색인될 수 있다.
 *
 * 그래서 루트 `loading.tsx`를 두지 않는다. 잃는 것은 거의 없다: 라우트가 대부분
 * 정적·ISR이라 즉시 그려지고, 로딩 경계가 없으면 이동 중에는 이전 화면이 그대로
 * 남는다 — 전체 화면 스피너로 갈아끼우는 것보다 낫다. 특정 느린 라우트에
 * 로딩 UI가 필요해지면 루트가 아니라 **그 라우트 폴더 안에** 두어야 한다.
 */
export default function NotFound() {
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
