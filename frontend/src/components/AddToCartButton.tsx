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

  return (
    <div className="pt-2">
      <button
        onClick={handleAddToCart}
        disabled={!product.in_stock}
        className={`w-full justify-center rounded-[var(--radius-pill)] px-6 py-4 text-sm font-medium tracking-[-0.01em] transition-all ${
          !product.in_stock
            ? 'bg-stone text-muted cursor-not-allowed'
            : added
            ? 'bg-accent text-white'
            : 'bg-ink text-white hover:bg-black hover:-translate-y-px'
        }`}
      >
        {!product.in_stock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Add to Cart'}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${product.name} added to cart` : ''}
      </span>
    </div>
  );
}
