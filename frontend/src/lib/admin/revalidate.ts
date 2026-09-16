import { revalidatePath } from 'next/cache';

/**
 * 상품이 바뀌면 다시 구울 곳. **서버 전용.**
 *
 * 샵 목록(`/shop`)과 상세(`/shop/[id]`)는 60초 ISR이고, 홈(`/`)도 판매 중인
 * 상품 넷을 싣는다. 60초면 결국 따라오지만, 가격을 고친 직후에 옛 가격이
 * 보이는 60초가 하필 고객이 보는 60초일 수 있다.
 *
 * sitemap도 같이 — 초안으로 내린 상품의 주소는 404가 되므로 sitemap에서도
 * 바로 빠져야 한다.
 *
 * 상세는 동적 세그먼트라 패턴 + `'page'`로 넘긴다(`lib/cache-tags.ts`와 같은
 * 이유). 라우트 핸들러에서 부르면 표시만 해 두고 다음 방문 때 다시 굽는다.
 */
export function revalidateShop(): void {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  revalidatePath('/sitemap.xml');
}
