import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NOTES_CACHE_TAG, NOTES_PRESENCE_TAG, SETTINGS_CACHE_TAG } from '@/lib/cache-tags';

/**
 * 관리 화면의 변경이 공개 페이지에 닿는 곳. **서버 전용.**
 *
 * 무엇이 바뀌면 어느 경로·태그를 다시 굽는지가 이 파일 하나에 있다. 태그 이름은
 * `lib/cache-tags.ts`에 그대로 둔다 — 읽는 쪽(`lib/supabase.ts`)과 같이 쓰는
 * 상수라, 여기로 옮기면 공개 조회가 `server-only` 모듈을 끌어오게 된다.
 *
 * 공통 규칙 두 가지:
 *  - 동적 세그먼트는 리터럴 경로가 아니라 라우트 패턴 + `'page'`로 넘긴다(패턴에
 *    세그먼트가 있으면 `type`이 필수다). 라우트 핸들러에서 부르면 표시만 해
 *    두고 실제 재생성은 그 경로를 다음에 방문할 때 일어나므로, 앨범이나 상품이
 *    몇 개든 한 번에 여러 번 다시 굽지 않는다.
 *  - 태그는 `{ expire: 0 }`으로 무효화한다. 라우트 핸들러에서 부르므로, 다음
 *    요청이 옛 값을 받지 않게 바로 만료시킨다.
 *
 * 목록은 `src/lib/__tests__/admin-revalidate.test.ts`가 정확히 일치하는지 본다.
 */

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
 */
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

/** 장소 좌표가 바뀌었을 때. 지도는 /archive에만 있다 — 앨범 상세와 홈은 좌표를 쓰지 않는다. */
export function revalidatePlaces(): void {
  revalidatePath('/archive');
}

/**
 * 노트가 바뀌었을 때. 목록 태그와 노트 페이지들, RSS, sitemap.
 *
 * `presenceChanged`는 공개된 글이 0 ↔ 1 이상으로 바뀐 경우다. 그때만 레이아웃까지
 * 다시 굽는다 — 이유는 `NOTES_PRESENCE_TAG`(`lib/cache-tags.ts`) 주석에 있다.
 */
export function revalidateNotes({ presenceChanged }: { presenceChanged: boolean }): void {
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

/**
 * 상품이 바뀌면 다시 구울 곳.
 *
 * 샵 목록(`/shop`)과 상세(`/shop/[id]`)는 60초 ISR이고, 홈(`/`)도 판매 중인
 * 상품 넷을 싣는다. 60초면 결국 따라오지만, 가격을 고친 직후에 옛 가격이
 * 보이는 60초가 하필 고객이 보는 60초일 수 있다.
 *
 * sitemap도 같이 — 초안으로 내린 상품의 주소는 404가 되므로 sitemap에서도
 * 바로 빠져야 한다.
 */
export function revalidateShop(): void {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  revalidatePath('/sitemap.xml');
}

/** 사이트 설정(홈 히어로)이 바뀌었을 때. 설정은 경로가 아니라 태그로 캐시된다. */
export function revalidateSettings(): void {
  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
}
