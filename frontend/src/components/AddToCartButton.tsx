"use client";

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { isAvailable, UNAVAILABLE_LABEL } from '@/lib/product';

interface Props {
  product: {
    id: number;
    name: string;
    price: number;
    image_url: string;
    in_stock: boolean;
  };
}

export default function AddToCartButton({ product }: Props) {
  // Selector, not the whole store: destructuring subscribes this button to
  // every cart change, so adding one item re-rendered every Add button on the
  // page. `addItem` is a stable reference, so this never re-renders at all.
  const addItem = useCartStore(state => state.addItem);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available = isAvailable(product);

  const handleAddToCart = () => {
    if (!available) return;
    addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Shares the visual language of `.btn-primary` (forest pill, hover lift +
  // shadow) but carries three states, so the state styles live here.
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 py-4 text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,box-shadow] duration-200';
  const stateClass = !available
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added
    ? 'bg-moss text-forest-black'
    : 'bg-primary text-primary-foreground hover:bg-fern hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_var(--forest)] active:translate-y-0 active:shadow-none';

  return (
    <div className="pt-2">
      <button
        onClick={handleAddToCart}
        disabled={!available}
        className={`${base} ${stateClass}`}
      >
        {added && (
          <span aria-hidden className="text-base leading-none">✓</span>
        )}
        {!available ? UNAVAILABLE_LABEL : added ? '장바구니에 담았어요' : '장바구니에 담기'}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${product.name} 장바구니에 담았습니다.` : ''}
      </span>
    </div>
  );
}
