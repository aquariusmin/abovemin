"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { formatPriceRange } from '@/lib/price';
import { SOLD_OUT_LABEL } from '@/lib/product';

/**
 * 상품 페이지의 "함께 구매" — 관리자가 이 상품에 이어 둔 다른 상품들.
 *
 * 여기 나오는 것은 **보통 상품**이다. 담으면 장바구니의 평범한 한 줄이 되고,
 * 주문 API도 다른 줄과 똑같이 다룬다(추가 상품과 다른 점이다).
 *
 * 한 줄에서 할 수 있는 일은 샵 목록의 카드와 같다:
 *  - 옵션이 없고 살 수 있으면 바로 담는 40px 원형 버튼.
 *  - 옵션이 있으면 고르는 자리는 그 상품의 페이지다 — 여기서 옵션 선택을 다시
 *    만들지 않고 그리로 보낸다.
 *  - 품절이면 상태만 적는다. 초안과 지워진 상품은 서버가 이미 뺐다
 *    (`lib/product.ts`의 `relatedProducts`).
 *
 * 서버(`shop/[id]/page.tsx`)가 그릴 값만 넘긴다 — 옵션 배열·설명 전문을 RSC
 * 페이로드에 실을 이유가 없다(`ShopCatalog`와 같다).
 */
export interface RelatedItem {
  id: number;
  name: string;
  image_url: string;
  state: 'available' | 'sold_out';
  /** 장바구니에 담을 가격. 옵션이 없는 상품만 쓴다. */
  price: number;
  priceMin: number;
  priceMax: number;
  hasOptions: boolean;
}

export default function RelatedProducts({ items }: { items: RelatedItem[] }) {
  const addItem = useCartStore(state => state.addItem);
  const [addedId, setAddedId] = useState<number | null>(null);
  // 줄마다가 아니라 구역에 하나 — 담은 것을 한 번만 읽어 준다.
  const [announcement, setAnnouncement] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (items.length === 0) return null;

  const add = (item: RelatedItem) => {
    if (item.state !== 'available' || item.hasOptions) return;
    addItem({ id: item.id, option_id: null, option_label: null, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setAnnouncement(`${item.name} 장바구니에 담았습니다.`);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section aria-labelledby="related-heading" className="max-w-6xl mx-auto mt-16 md:mt-24">
      <span aria-live="polite" className="sr-only">{announcement}</span>
      <h2 id="related-heading" className="label-ko eyebrow-marked text-muted-foreground mb-4">함께 구매</h2>
      <ul className="grid grid-cols-1 gap-x-10 border-t border-hairline sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => {
          const available = item.state === 'available';
          return (
            // 줄은 평범한 컨테이너다. 상품 링크가 `.card-link`로 줄 전체에 펴지고,
            // 담기 버튼은 그 위에 놓인다 — <a> 안에 <button>을 넣지 않는다.
            <li
              key={item.id}
              className="card-surface group flex items-center gap-4 border-b border-hairline py-4 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
            >
              {/* 높이만 맞추고 폭은 사진 비율대로 — 자르지 않는다. */}
              <span className="flex w-20 shrink-0 justify-center">
                {item.image_url && (
                  <Image
                    src={item.image_url}
                    alt=""
                    width={0}
                    height={0}
                    sizes="80px"
                    className="h-16 w-auto max-w-full rounded-md border border-border-light bg-stone"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-medium leading-snug text-ink-body transition-colors group-hover:text-primary">
                  <Link href={`/shop/${item.id}`} className="card-link outline-none">
                    {item.name}
                  </Link>
                </h3>
                <p className={`mt-1 text-sm tabular-nums ${available && item.priceMin > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {formatPriceRange({ min: item.priceMin, max: item.priceMax })}
                </p>
              </div>
              {!available ? (
                <span className="label-ko shrink-0 text-muted-foreground">{SOLD_OUT_LABEL}</span>
              ) : item.hasOptions ? (
                // 줄 전체가 이미 그 상품으로 가는 링크다. 이 글자는 "여기서는 담기지
                // 않고, 가서 고른다"를 알리는 표시일 뿐이라 따로 링크를 두지 않는다.
                <span aria-hidden className="label-ko shrink-0 text-slate">옵션 고르기 →</span>
              ) : (
                <button
                  type="button"
                  onClick={() => add(item)}
                  aria-label={`${item.name} 장바구니에 담기`}
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-medium leading-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    addedId === item.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-forest hover:-translate-y-0.5 hover:border-primary hover:bg-moss-wash active:translate-y-0'
                  }`}
                >
                  {addedId === item.id ? '✓' : '+'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
