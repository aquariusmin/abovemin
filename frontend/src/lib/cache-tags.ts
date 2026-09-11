import { revalidatePath } from 'next/cache';

export const SETTINGS_CACHE_TAG = 'site-settings';

/**
 * 아카이브(앨범 목록 + 앨범 상세)를 다시 굽는다.
 *
 * 두 페이지는 `revalidate = 0`이었다. 관리 화면에서 사진을 올리면 바로
 * 보이라는 뜻이었고 그 목적은 달성했지만, 대가로 **방문 한 번마다** Supabase
 * 왕복이 두 번씩 생긴다 — 몇 달에 한 번 바뀌는 사진첩을 위해 모든 방문자가
 * 치르는 비용이다.
 *
 * 대신 페이지는 시간 기반 ISR로 돌리고, 내용이 실제로 바뀌는 순간
 * (업로드·수정·삭제·순서 변경)에 여기서 무효화한다. 관리자가 보는 즉시성은
 * 그대로이고 왕복만 사라진다.
 *
 * 앨범 상세는 동적 세그먼트라 리터럴 경로가 아니라 라우트 패턴 + `'page'`로
 * 넘겨야 한다 (패턴에 세그먼트가 있으면 `type`이 필수다). 라우트 핸들러에서
 * 호출하면 표시만 해 두고 실제 재생성은 그 경로를 다음에 방문할 때 일어나므로,
 * 앨범이 몇 개든 한 번에 여러 번 다시 굽지 않는다.
 */
export function revalidateArchive(): void {
  revalidatePath('/archive');
  revalidatePath('/archive/[slug]', 'page');
}
