/**
 * 탭 목록의 키보드 이동(WAI-ARIA Tabs 패턴). 탭 바에서 Tab 키는 선택된 탭
 * 하나에만 멈추고(roving tabindex), 탭 사이는 화살표로 옮긴다.
 *
 * ←/→는 양 끝에서 반대쪽으로 돌아가고, Home/End는 처음/끝으로 간다.
 * 다른 키는 `null` — 호출한 쪽이 기본 동작을 막지 않도록.
 */
export function tabKeyTarget(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
