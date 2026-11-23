import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NOTES_CACHE_TAG, NOTES_PRESENCE_TAG, SETTINGS_CACHE_TAG } from '@/lib/cache-tags';

// 서버 전용. 동적 세그먼트는 라우트 패턴 + 'page'로, 태그는 { expire: 0 }으로 무효화한다.

// 아카이브는 시간 기반 ISR이고, 내용이 바뀌는 순간 여기서 무효화한다.
export function revalidateArchive(): void {
  // 홈의 "최근 아카이브" 띠도 무효화해야 지운 사진이 홈에 남지 않는다.
  revalidatePath('/');
  revalidatePath('/archive');
  revalidatePath('/archive/[slug]', 'page');
  revalidatePath('/archive/[slug]/[id]', 'page');
  revalidatePath('/archive/timeline');
  // sitemap이 사진 페이지를 싣는다. 지운 사진의 주소를 계속 신고하지 않게.
  revalidatePath('/sitemap.xml');
}

// 지도는 /archive에만 있다 — 앨범 상세와 홈은 좌표를 쓰지 않는다.
export function revalidatePlaces(): void {
  revalidatePath('/archive');
}

// presenceChanged(공개 글 0 ↔ 1 이상)일 때만 레이아웃까지 다시 굽는다.
export function revalidateNotes({ presenceChanged }: { presenceChanged: boolean }): void {
  revalidateTag(NOTES_CACHE_TAG, { expire: 0 });
  revalidatePath('/notes');
  revalidatePath('/notes/[slug]', 'page');
  revalidatePath('/notes/rss.xml');
  revalidatePath('/sitemap.xml');
  if (presenceChanged) {
    // 푸터의 Notes 링크가 생기거나 사라져야 하고, 푸터는 모든 페이지의 레이아웃에 있다.
    revalidateTag(NOTES_PRESENCE_TAG, { expire: 0 });
    revalidatePath('/', 'layout');
  }
}

// 샵 목록·상세·홈(판매 중 상품)·sitemap을 모두 덮는다 — 옛 가격이 60초 보이지 않게.
export function revalidateShop(): void {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  revalidatePath('/sitemap.xml');
}

// 설정은 경로가 아니라 태그로 캐시된다.
export function revalidateSettings(): void {
  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
}
