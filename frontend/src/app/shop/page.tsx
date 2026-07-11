"use client";

import { useEffect, useState } from 'react';
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

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const { addItem } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent, item: Product) => {
    e.preventDefault();
    if (!item.in_stock) return;
    addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1500);
  };

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
    <main className="min-h-screen flex items-center justify-center bg-canvas">
      <p className="eyebrow text-muted">Synchronizing phorage stock…</p>
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
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort products"
              className="bg-transparent text-sm font-medium text-ink cursor-pointer focus:outline-none focus-visible:underline appearance-none"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
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
              className="break-inside-avoid group block"
              variants={itemVariants}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Media */}
              <div
                className={`relative overflow-hidden rounded-md border bg-stone transition-colors duration-500 ${
                  hoveredId === item.id ? 'border-accent' : 'border-border-light'
                }`}
              >
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
                  className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-sm font-medium transition-all ${
                    !item.in_stock
                      ? 'border-border-light text-muted cursor-not-allowed'
                      : addedId === item.id
                      ? 'bg-accent border-accent text-white'
                      : 'border-hairline text-ink hover:border-accent hover:text-accent'
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
