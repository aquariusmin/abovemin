"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { formatPriceRange } from '@/lib/price';
import { productPath, SOLD_OUT_LABEL } from '@/lib/product';

export interface RelatedItem {
  id: number;
  slug: string | null;
  name: string;
  image_url: string;
  state: 'available' | 'sold_out';
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
            // <a> 안에 <button>을 넣지 않는다: 링크는 `.card-link`로 줄 전체에 펴지고 버튼은 그 위에 놓인다.
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
                  <Link href={productPath(item)} className="card-link outline-none">
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
                // 줄 전체가 이미 그 상품으로 가는 링크라 이 글자는 표시일 뿐이다.
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
