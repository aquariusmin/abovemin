/**
 * 사이트 크롬(Nav·Footer)이 없는 화면의 본문 틀 — `(bare)` 그룹의 레이아웃이
 * 그린다. `SiteChrome`과 짝이다.
 *
 * `id="main-content"`는 루트 레이아웃의 "본문 바로가기" 링크가 가리키는
 * 곳이고, `flex-grow`는 body(세로 flex, min-h-screen)를 채운다. Nav가 없으니
 * Nav 높이만큼의 위쪽 여백도 없다.
 */
export default function BareFrame({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-content" className="flex-grow">
      {children}
    </div>
  );
}
