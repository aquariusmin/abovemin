"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tag: string | null;
  image_url: string;
  in_stock: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function ShopCatalog({ products, loadError }: { products: Product[]; loadError: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const [addedId, setAddedId] = useState<number | null>(null);
  // One page-level live region instead of one per card, so a screen reader
  // announces the addition once rather than re-reading every card.
  const [announcement, setAnnouncement] = useState('');
  const { addItem } = useCartStore();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The button is no longer inside the product link, so there is nothing to
  // preventDefault — a plain click handler is enough.
  const handleAddToCart = (item: Product) => {
    if (!item.in_stock) return;
    addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setAnnouncement(`${item.name} 장바구니에 담았습니다.`);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedId(null), 1500);
  };

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(i => i.category)))];
  const filtered = (selectedCategory === 'All' ? products : products.filter(i => i.category === selectedCategory))
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
                {cat}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 self-start md:self-auto">
            <span className="eyebrow text-muted-foreground">Sort</span>
            <span className="relative inline-flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort products"
                className="appearance-none bg-transparent pr-6 text-sm font-medium text-ink cursor-pointer rounded-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price low → high</option>
                <option value="price-desc">Price high → low</option>
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
          {filtered.map((item, i) => (
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
                {item.tag && (
                  <span className="badge-solid pointer-events-none absolute top-3 right-3 z-20">
                    {item.tag}
                  </span>
                )}
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={0}
                  height={0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  draggable={false}
                  priority={i === 0}
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
                  <p className="mt-1.5 text-sm font-semibold text-primary">
                    ₩&nbsp;{item.price.toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={!item.in_stock}
                  aria-label={
                    item.in_stock ? `${item.name} 장바구니에 담기` : `${item.name} 품절`
                  }
                  className={`relative z-10 shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base leading-none font-medium transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    !item.in_stock
                      ? 'border-border-light text-muted-foreground cursor-not-allowed'
                      : addedId === item.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-forest hover:border-primary hover:bg-moss-wash hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {!item.in_stock ? '—' : addedId === item.id ? '✓' : '+'}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}
