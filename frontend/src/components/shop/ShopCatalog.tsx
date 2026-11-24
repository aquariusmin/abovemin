"use client";

import { useRef, useState, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { revealTarget, useBelowFoldReveal } from '@/components/motion/useBelowFoldReveal';
import { useCartStore } from '@/store/cartStore';
import { formatPriceRange } from '@/lib/price';
import { SOLD_OUT_LABEL } from '@/lib/product';
import { placeholderStyle } from '@/components/photo-placeholder';
import { mayHaveAlpha } from '@/lib/cloudinary';
import { displayFace, labelFace } from '@/lib/typography';

export interface CatalogItem {
  id: number;
  name: string;
  category: string;
  tag: string | null;
  image_url: string;
  aspect: number | null;
  edition: string | null;
  state: 'available' | 'sold_out';
  price: number;
  priceMin: number;
  priceMax: number;
  hasOptions: boolean;
}

type Product = CatalogItem;

const ALL = '__all__';

const CATEGORY_LABELS: Record<string, string> = {
  Poster: '포스터',
  Postcard: '엽서',
  Stationery: '문구',
};
const categoryLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat;

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

/** 서버 HTML에서는 모두 보이고, 마운트 때 뷰포트 아래에 있던 카드만 올라온다(첫 사진이 LCP). */
function RevealCard({ className, children }: { className: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const { ref, hidden } = useBelowFoldReveal<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={revealTarget(hidden, reduce, 16)}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export default function ShopCatalog({ products, loadError }: { products: Product[]; loadError: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const [addedId, setAddedId] = useState<number | null>(null);
  // One page-level live region, so a screen reader announces an addition once.
  const [announcement, setAnnouncement] = useState('');
  const addItem = useCartStore(state => state.addItem);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddToCart = (item: Product) => {
    if (item.state !== 'available' || item.hasOptions) return;
    addItem({ id: item.id, option_id: null, option_label: null, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setAnnouncement(`${item.name} 장바구니에 담았습니다.`);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedId(null), 1500);
  };

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  // 살 수 있는 상품이 하나뿐이면 담기(+) 버튼 없이 상세의 "바로 주문하기"로 보낸다.
  const directOrder = products.filter(p => p.state === 'available').length === 1;

  const categories = [ALL, ...Array.from(new Set(products.map(i => i.category)))];
  const filtered = (selectedCategory === ALL ? products : products.filter(i => i.category === selectedCategory))
    .toSorted((a, b) => {
      if (a.state !== b.state) return a.state === 'available' ? -1 : 1;
      if (sortBy === 'price-asc') return a.priceMin - b.priceMin;
      if (sortBy === 'price-desc') return b.priceMin - a.priceMin;
      return b.id - a.id;
    });

  return (
    <>
      <span aria-live="polite" className="sr-only">{announcement}</span>

      <header className="max-w-[1400px] mx-auto mb-10 md:mb-16">
        <p className="eyebrow eyebrow-marked text-primary mb-4">Shop Collection</p>
        <h1 className="font-display-ko text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] text-ink max-w-3xl">
          사진으로 만든 작은 것들.
        </h1>

        {products.length > 0 && (
        <div className="mt-8 md:mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-hairline pt-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                data-active={selectedCategory === cat}
                aria-pressed={selectedCategory === cat}
                className="btn-outline"
              >
                {cat === ALL ? '전체' : categoryLabel(cat)}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 self-start md:self-auto">
            <span className="label-ko text-muted-foreground">정렬</span>
            <span className="relative inline-flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                aria-label="상품 정렬"
                className="appearance-none bg-transparent border-b border-field-edge pb-0.5 pr-6 text-sm font-medium text-ink cursor-pointer rounded-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <option value="newest">최신순</option>
                <option value="price-asc">가격 낮은순</option>
                <option value="price-desc">가격 높은순</option>
              </select>
              <svg
                aria-hidden
                viewBox="0 0 12 12"
                className="pointer-events-none absolute right-0 h-3 w-3 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        </div>
        )}
      </header>

      {loadError ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted-foreground mb-3">Error</p>
          <p className="text-lg text-ink-body">상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted-foreground mb-3">No stock</p>
          <p className="text-lg text-ink-body">지금은 판매 중인 소품이 없습니다.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="text-lg text-ink-body">이 카테고리에는 아직 상품이 없습니다.</p>
        </div>
      ) : filtered.length === 1 ? (
        <FeaturedCard
          item={filtered[0]}
          showAdd={filtered[0].state === 'available' && !filtered[0].hasOptions && !directOrder}
          added={addedId === filtered[0].id}
          onAdd={() => handleAddToCart(filtered[0])}
        />
      ) : (
        // 두 개면 세 번째 열이 비어 보이니 두 열에서 멈춘다.
        <div
          className={`columns-1 sm:columns-2 gap-6 md:gap-8 space-y-6 md:space-y-8 mx-auto ${
            filtered.length === 2 ? 'max-w-[960px]' : 'lg:columns-3 max-w-[1400px]'
          }`}
        >
          {filtered.map((item, i) => {
            const available = item.state === 'available';
            const cutout = mayHaveAlpha(item.image_url);
            return (
            // The card is not an <a>: the stretched `.card-link` and the button are siblings, never nested.
            <RevealCard
              key={item.id}
              className="break-inside-avoid card-surface group has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring rounded-md"
            >
              <div
                className={
                  cutout
                    ? 'relative overflow-hidden'
                    : 'relative overflow-hidden rounded-lg border border-border-light bg-stone transition-colors duration-500 group-hover:border-primary'
                }
                style={cutout ? undefined : placeholderStyle(item.image_url)}
              >
                {/* Sits above the stretched link but must not swallow its clicks, hence pointer-events-none. */}
                {!available ? (
                  <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20 normal-case tracking-normal text-xs">
                    {SOLD_OUT_LABEL}
                  </span>
                ) : item.tag ? (
                  <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20">
                    {item.tag}
                  </span>
                ) : null}
                {/* Not `preload`: the LCP tile depends on the column count, so `loading`/`fetchPriority` instead. */}
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={0}
                  height={0}
                  // `sizes`는 칸의 실제 폭(`PhotoGrid`와 같은 계산, 열 간격 24px → md부터 32px).
                  sizes="(min-width: 1480px) 446px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, calc(100vw - 40px)"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  // 사진을 받기 전에 자리를 잡는다(밀림 방지). `auto`가 앞이라 도착한 실제 비율이 이긴다.
                  style={item.aspect ? { aspectRatio: `auto ${item.aspect}` } : undefined}
                  draggable={false}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : undefined}
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`${labelFace(item.category)} text-muted-foreground mb-1.5`}>{item.category}</p>
                  <h2 className="text-[15px] font-medium text-ink-body leading-snug group-hover:text-primary transition-colors">
                    <Link href={`/shop/${item.id}`} className="card-link outline-none">
                      {item.name}
                    </Link>
                  </h2>
                  {item.edition && (
                    <p className="mt-1 text-[13px] text-muted-foreground">{item.edition}</p>
                  )}
                  <p className={`mt-1.5 text-[15px] tabular-nums ${available && item.priceMin > 0 ? 'font-medium text-ink-body' : 'text-muted-foreground'}`}>
                    {formatPriceRange({ min: item.priceMin, max: item.priceMax })}
                  </p>
                </div>

                {available && !item.hasOptions && !directOrder && (
                  <AddButton name={item.name} added={addedId === item.id} onAdd={() => handleAddToCart(item)} />
                )}
              </div>
            </RevealCard>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddButton({ name, added, onAdd }: { name: string; added: boolean; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      aria-label={`${name} 장바구니에 담기`}
      className={`relative z-10 shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base leading-none font-medium transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        added
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-border text-forest hover:border-primary hover:bg-moss-wash hover:-translate-y-0.5 active:translate-y-0'
      }`}
    >
      {added ? '✓' : '+'}
    </button>
  );
}

/**
 * 상품이 하나뿐일 때. 세 열 그리드에 카드 하나를 두면 데스크톱에서 화면 대부분이 빈다 —
 * 홈의 "새로 나온 소품"처럼 사진과 글을 나란히 크게 놓는다. 사진은 자르지 않는다.
 */
function FeaturedCard({
  item,
  showAdd,
  added,
  onAdd,
}: {
  item: Product;
  showAdd: boolean;
  added: boolean;
  onAdd: () => void;
}) {
  const available = item.state === 'available';
  const cutout = mayHaveAlpha(item.image_url);
  return (
    <RevealCard className="card-surface group max-w-[1400px] mx-auto grid items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20 rounded-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring">
      <div className="flex justify-center md:justify-end">
        <div
          className={cutout ? 'relative' : 'relative overflow-hidden rounded-lg border border-border-light bg-stone transition-colors duration-500 group-hover:border-primary'}
          style={cutout ? undefined : placeholderStyle(item.image_url)}
        >
          {!available ? (
            <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20 normal-case tracking-normal text-xs">
              {SOLD_OUT_LABEL}
            </span>
          ) : item.tag ? (
            <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20">{item.tag}</span>
          ) : null}
          <Image
            src={item.image_url}
            alt={item.name}
            width={0}
            height={0}
            // 칸 폭: 두 열 중 하나(max-w 1400, 간격 56/80px). 높이 상한이 걸리면 더 좁다.
            sizes="(min-width: 1480px) 660px, (min-width: 768px) 45vw, calc(100vw - 40px)"
            className="block h-auto w-auto max-w-full max-h-[min(36rem,70svh)] transition-transform duration-700 group-hover:scale-[1.01]"
            style={item.aspect ? { aspectRatio: `auto ${item.aspect}` } : undefined}
            draggable={false}
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>

      <div className="max-w-md">
        <p className={`${labelFace(item.category)} text-muted-foreground`}>{item.category}</p>
        <h2 className={`mt-4 ${displayFace(item.name)} text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink group-hover:text-primary transition-colors`}>
          <Link href={`/shop/${item.id}`} className="card-link outline-none">
            {item.name}
          </Link>
        </h2>
        {item.edition && <p className="mt-2 text-[15px] text-slate">{item.edition}</p>}
        <p className={`mt-4 text-lg tabular-nums ${available && item.priceMin > 0 ? 'font-medium text-ink-body' : 'text-muted-foreground'}`}>
          {formatPriceRange({ min: item.priceMin, max: item.priceMax })}
        </p>
        <div className="mt-8 flex items-center gap-5">
          <span className="link-underline text-sm text-ink">자세히 보기 →</span>
          {showAdd && <AddButton name={item.name} added={added} onAdd={onAdd} />}
        </div>
      </div>
    </RevealCard>
  );
}
