import Link from 'next/link';

/**
 * 상위 목록으로 돌아가는 링크 — 사이트 전체에서 한 모양.
 *
 * 앨범은 모노 대문자 "← ARCHIVE", 상품 상세는 "← Back to Shop", 결제는
 * "← Back to Cart"로 셋이 제각각이었다. 누르는 컨트롤은 한국어로 둔다는
 * 원칙에 맞춰 `.link-underline` + 한국어 라벨 하나로 모은다. 모노 eyebrow는
 * 섹션 표지이지 링크처럼 보이지 않는다는 점도 이쪽을 고른 이유다.
 */
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-underline text-sm text-slate">
      <span aria-hidden>&larr;</span> {children}
    </Link>
  );
}
