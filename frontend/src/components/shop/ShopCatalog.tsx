"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/price';
import { isAvailable, UNAVAILABLE_LABEL } from '@/lib/product';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tag: string | null;
  image_url: string;
  in_stock: boolean;
}

// Sentinel for "no category filter". Kept distinct from a real category name
// because category values come from the DB; the Korean label is display-only.
const ALL = '__all__';

// 카테고리 값은 DB의 영문 키다. 필터 칩은 누르는 컨트롤이라 한국어로 보여 주고,
// 옆의 "전체"와 같은 언어로 맞춘다. 모르는 값은 그대로 둔다 — 관리 화면에서
// 새 카테고리를 넣었을 때 칩이 사라지는 것보다 영문으로라도 보이는 편이 낫다.
const CATEGORY_LABELS: Record<string, string> = {
  Poster: '포스터',
  Postcard: '엽서',
  Stationery: '문구',
};
const categoryLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function ShopCatalog({ products, loadError }: { products: Product[]; loadError: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const [addedId, setAddedId] = useState<number | null>(null);
  // One page-level live region instead of one per card, so a screen reader
  // announces the addition once rather than re-reading every card.
  const [announcement, setAnnouncement] = useState('');
  const addItem = useCartStore(state => state.addItem);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The button is no longer inside the product link, so there is nothing to
  // preventDefault — a plain click handler is enough.
  const handleAddToCart = (item: Product) => {
    if (!isAvailable(item)) return;
    addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setAnnouncement(`${item.name} 장바구니에 담았습니다.`);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedId(null), 1500);
  };

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  const categories = [ALL, ...Array.from(new Set(products.map(i => i.category)))];
  const filtered = (selectedCategory === ALL ? products : products.filter(i => i.category === selectedCategory))
    .toSorted((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.id - a.id; // newest
    });

  return (
    <>
      <span aria-live="polite" className="sr-only">{announcement}</span>

      {/* Page header */}
      <header className="max-w-[1400px] mx-auto mb-10 md:mb-16">
        <p className="eyebrow eyebrow-marked text-primary mb-4">Shop Collection</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.05] text-ink max-w-3xl">
          Tangible light for your space.
        </h1>

        {/* Filter + sort bar */}
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
                className="appearance-none bg-transparent pr-6 text-sm font-medium text-ink cursor-pointer rounded-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      </header>

      {/* Empty / error state */}
      {loadError ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted-foreground mb-3">Error</p>
          <p className="text-lg text-ink-body">상품을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted-foreground mb-3">No stock</p>
          <p className="text-lg text-ink-body">아직 준비된 소품이 없어요. 곧 새로운 컬렉션으로 찾아올게요.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="text-lg text-ink-body">이 카테고리에는 아직 상품이 없어요.</p>
        </div>
      ) : (
        <motion.div
          className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 space-y-6 md:space-y-8 max-w-[1400px] mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {filtered.map((item, i) => {
            const available = isAvailable(item);
            return (
            // The card is a plain container, not an <a>. The product link
            // stretches over the whole card via `.card-link`, and the add-to-cart
            // button sits above that overlay — so the two controls are siblings
            // rather than a <button> nested inside an <a>.
            <motion.div
              key={item.id}
              className="break-inside-avoid card-surface group has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring rounded-md"
              variants={itemVariants}
            >
              {/* Media */}
              <div className="relative overflow-hidden rounded-lg border border-border-light bg-stone transition-colors duration-500 group-hover:border-primary">
                {/* Sits above the stretched link but must not swallow its
                    clicks, hence pointer-events-none. */}
                {/* 판매 중이 아니면 태그 대신 상태를 단다. DB의 태그("Coming
                    Soon")와 상태 문구가 한 카드에서 두 번 같은 말을 하던 것을
                    하나로 줄였다. Hangul은 대문자·자간 규칙을 받지 않는다. */}
                {!available ? (
                  <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20 normal-case tracking-normal text-[11px]">
                    {UNAVAILABLE_LABEL}
                  </span>
                ) : item.tag ? (
                  <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20">
                    {item.tag}
                  </span>
                ) : null}
                {/* Next 16 deprecates `priority` in favour of `preload`, but a
                    preload link is the wrong migration for a masonry grid: the
                    column count changes with the viewport, so which tile is the
                    LCP element is not knowable from the markup — the docs name
                    this case explicitly and point at these two props instead.
                    Same treatment the Lightbox already uses. */}
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={0}
                  height={0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  draggable={false}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                />
              </div>

              {/* Info */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow text-muted-foreground mb-1.5">{item.category}</p>
                  <h2 className="text-[15px] font-medium text-ink-body leading-snug group-hover:text-primary transition-colors">
                    <Link href={`/shop/${item.id}`} className="card-link outline-none">
                      {item.name}
                    </Link>
                  </h2>
                  <p className={`mt-1.5 text-sm ${item.price > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* 살 수 없는 상품에는 담기 버튼을 두지 않는다. 비활성 원형
                    버튼에 "—"를 넣어 두었더니 "빼기"로 읽혔고, 상태는 이미
                    사진 위 배지가 말하고 있다. */}
                {available && (
                <button
                  onClick={() => handleAddToCart(item)}
                  aria-label={`${item.name} 장바구니에 담기`}
                  className={`relative z-10 shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base leading-none font-medium transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    addedId === item.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-forest hover:border-primary hover:bg-moss-wash hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {addedId === item.id ? '✓' : '+'}
                </button>
                )}
              </div>
            </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
}
