/**
 * 캐시 태그 이름. 읽는 쪽(`lib/supabase.ts`의 `unstable_cache`)과 무효화하는 쪽
 * (`lib/admin/revalidate.ts`)이 같은 상수를 본다. 무효화 함수는 여기 두지
 * 않는다 — 그쪽은 서버 전용이다.
 */

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
