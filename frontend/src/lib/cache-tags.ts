import { revalidatePath, revalidateTag } from 'next/cache';

export const SETTINGS_CACHE_TAG = 'site-settings';

/** 공개된 노트 목록(`getPublishedNotes`). /notes·글·RSS·sitemap이 읽는다. */
export const NOTES_CACHE_TAG = 'notes';

/**
 * "공개된 노트가 한 편이라도 있나"(`hasPublishedNotes`). 루트 레이아웃이 푸터
 * 링크를 위해 읽으므로 **모든 페이지**가 이 태그를 달고 있다. 그래서 목록 태그와
 * 나눴다 — 초안의 오타 하나를 고칠 때마다 사이트 전체의 ISR 캐시를 비울 이유가
 * 없다. 이 태그는 공개된 글이 0 ↔ 1 이상으로 바뀔 때만 무효화한다.
 */
export const NOTES_PRESENCE_TAG = 'notes-presence';


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
export function revalidateNotes({ presenceChanged }: { presenceChanged: boolean }): void {
  // 라우트 핸들러에서 부르므로 `{ expire: 0 }` — 설정 저장(`api/admin/settings`)과
  // 같이, 다음 요청이 옛 목록을 받지 않게 바로 만료시킨다.
  revalidateTag(NOTES_CACHE_TAG, { expire: 0 });
  revalidatePath('/notes');
  revalidatePath('/notes/[slug]', 'page');
  revalidatePath('/notes/rss.xml');
  revalidatePath('/sitemap.xml');
  if (presenceChanged) {
    // 첫 글이 공개되거나 마지막 글이 내려간 순간: 푸터의 Notes 링크가 생기거나
    // 사라져야 하고, 푸터는 모든 페이지의 레이아웃에 있다.
    revalidateTag(NOTES_PRESENCE_TAG, { expire: 0 });
    revalidatePath('/', 'layout');
  }
}

export function revalidateArchive(): void {
  // 홈이 "최근 아카이브" 띠에 최신 사진을 싣는다. 여기서 같이 무효화하지
  // 않으면 삭제한 사진이 홈에서만 최대 60초 더 살아 있고, 그 사진의 `?p=`
  // 링크는 앨범에서 아무것도 열지 못한다.
  revalidatePath('/');
  revalidatePath('/archive');
  revalidatePath('/archive/[slug]', 'page');
  // 사진 한 장의 페이지와 타임라인. 숨긴 사진의 페이지가 300초 동안 더 열리거나,
  // 제목을 고쳤는데 링크 미리보기가 옛 제목을 들고 있지 않게.
  revalidatePath('/archive/[slug]/[id]', 'page');
  revalidatePath('/archive/timeline');
  // sitemap이 사진 페이지를 싣는다. 지운 사진의 주소를 계속 신고하지 않게.
  revalidatePath('/sitemap.xml');
}
