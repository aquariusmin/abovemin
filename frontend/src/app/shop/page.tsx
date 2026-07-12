"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

const MotionLink = motion.create(Link);

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tag: string | null;
  image_url: string;
  in_stock: boolean;
}

export default function Shop() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const [addedId, setAddedId] = useState<number | null>(null);
  const { addItem } = useCartStore();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddToCart = (e: React.MouseEvent, item: Product) => {
    e.preventDefault();
    if (!item.in_stock) return;
    addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedId(null), 1500);
  };

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  useEffect(() => {
    import('@/lib/supabase').then(({ getProducts }) =>
      getProducts().then(data => {
        setItems(data.map(p => ({ ...p, image_url: p.image_url })));
        setLoading(false);
      }).catch(() => { setError(true); setLoading(false); })
    );
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = (selectedCategory === 'All' ? items : items.filter(i => i.category === selectedCategory))
    .toSorted((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.id - a.id; // newest
    });

  if (loading) return (
    <main className="min-h-screen bg-canvas px-4 sm:px-6 md:px-8 py-12 md:py-20">
      <header className="max-w-[1400px] mx-auto mb-10 md:mb-16">
        <p className="eyebrow text-muted mb-4">Shop Collection</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.05] text-ink max-w-3xl">
          Tangible light for your space.
        </h1>
        <div className="mt-8 md:mt-12 border-t border-hairline pt-6">
          <span className="sr-only" role="status" aria-live="polite">상품을 불러오는 중입니다…</span>
        </div>
      </header>
      {/* Skeleton masonry — reserves rhythm so content doesn't jump on load */}
      <div
        aria-hidden
        className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 space-y-6 md:space-y-8 max-w-[1400px] mx-auto"
      >
        {[62, 78, 70, 84, 66, 74].map((h, i) => (
          <div key={i} className="break-inside-avoid">
            <div className="rounded-md bg-stone animate-pulse" style={{ height: `${h * 4}px` }} />
            <div className="mt-4 h-3 w-16 rounded bg-stone animate-pulse" />
            <div className="mt-2 h-4 w-2/3 rounded bg-stone animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-canvas px-4 sm:px-6 md:px-8 py-12 md:py-20">

      {/* Page header */}
      <header className="max-w-[1400px] mx-auto mb-10 md:mb-16">
        <p className="eyebrow text-muted mb-4">Shop Collection</p>
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
            <span className="eyebrow text-muted">Sort</span>
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
                className="pointer-events-none absolute right-0 h-3 w-3 text-muted"
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
      {error ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted mb-3">Error</p>
          <p className="text-lg text-ink-body">상품을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-[1400px] mx-auto py-20 text-center">
          <p className="eyebrow text-muted mb-3">No stock</p>
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
          {filtered.map((item) => (
            <MotionLink
              href={`/shop/${item.id}`}
              key={item.id}
              className="break-inside-avoid group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              variants={itemVariants}
            >
              {/* Media */}
              <div className="relative overflow-hidden rounded-md border border-border-light bg-stone transition-colors duration-500 group-hover:border-accent">
                {item.tag && (
                  <span className="absolute top-3 right-3 z-10 rounded-[var(--radius-pill)] bg-ink px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white">
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
                />
              </div>

              {/* Info */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow text-muted mb-1.5">{item.category}</p>
                  <p className="text-[15px] font-medium text-ink-body leading-snug group-hover:text-accent transition-colors">
                    {item.name}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-accent">
                    ₩ {item.price.toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={(e) => handleAddToCart(e, item)}
                  disabled={!item.in_stock}
                  aria-label={item.in_stock ? `Add ${item.name} to cart` : `${item.name} out of stock`}
                  className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base leading-none font-medium transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    !item.in_stock
                      ? 'border-border-light text-muted cursor-not-allowed'
                      : addedId === item.id
                      ? 'bg-accent border-accent text-white'
                      : 'border-hairline text-ink hover:border-accent hover:text-accent hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {!item.in_stock ? '—' : addedId === item.id ? '✓' : '+'}
                </button>
              </div>
              <span aria-live="polite" className="sr-only">
                {addedId === item.id ? `${item.name} added to cart` : ''}
              </span>
            </MotionLink>
          ))}
        </motion.div>
      )}
    </main>
  );
}
