import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { hasPublishedNotes } from '@/lib/supabase';

/**
 * 공개 사이트의 머리(Nav)·본문 여백·꼬리(Footer).
 *
 * 크롬이 있는 라우트 그룹의 레이아웃이 이것을 그린다 — `app/(site)`와
 * `app/portfolio/(site)`. 크롬이 없는 화면(`(bare)` 그룹: /admin, 포트폴리오
 * 제출본·인쇄)은 그리지 않는다. 예전에는 루트 레이아웃이 모든 경로에 그리고
 * Nav·Footer·body 클래스가 각자 pathname을 보고 숨었다; 지금은 폴더 위치가
 * 그 판정이다.
 *
 * `pt-[72px] md:pt-[88px]`는 fixed인 Nav의 높이만큼 본문을 내리는 값이라 Nav와
 * 같은 곳에 둔다. 한쪽만 바꾸면 빈 띠나 내비에 덮인 제목이 생긴다.
 *
 * 루트 `not-found.tsx`도 이것으로 감싼다: 어느 라우트에도 맞지 않는 주소는
 * 그룹 레이아웃을 거치지 않고 루트 레이아웃 바로 아래에 그려지기 때문이다.
 */
export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  // 푸터의 Notes 링크. 캐시된 값이고(`NOTES_PRESENCE_TAG`), 실패하면 링크를
  // 숨긴다 — 푸터 한 줄 때문에 모든 페이지가 렌더에 실패할 수는 없다.
  const hasNotes = await hasPublishedNotes().catch(() => false);
  return (
    <>
      <Nav />
      <div id="main-content" className="flex-grow pt-[72px] md:pt-[88px]">
        {children}
      </div>
      <Footer hasNotes={hasNotes} />
    </>
  );
}
