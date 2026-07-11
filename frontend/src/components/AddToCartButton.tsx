"use client";

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';

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
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    if (!product.in_stock) return;
    addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // Shares the visual language of `.btn-primary` (near-black pill, hover lift +
  // shadow) but carries three states, so the state styles live here.
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 py-4 text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,box-shadow] duration-200';
  const stateClass = !product.in_stock
    ? 'bg-stone text-muted cursor-not-allowed'
    : added
    ? 'bg-accent text-white'
    : 'bg-ink text-white hover:bg-black hover:-translate-y-px hover:shadow-[0_8px_22px_-10px_rgba(0,0,0,0.45)] active:translate-y-0 active:shadow-none';

  return (
    <div className="pt-2">
      <button
        onClick={handleAddToCart}
        disabled={!product.in_stock}
        className={`${base} ${stateClass}`}
      >
        {added && (
          <span aria-hidden className="text-base leading-none">✓</span>
        )}
        {!product.in_stock ? 'Out of Stock' : added ? 'Added to Cart' : 'Add to Cart'}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${product.name} added to cart` : ''}
      </span>
    </div>
  );
}
