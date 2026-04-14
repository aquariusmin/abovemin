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

  const accentBg = "bg-accent";

  return (
    <div className="pt-6 flex space-x-4 items-center">
      <button
        onClick={handleAddToCart}
        disabled={!product.in_stock}
        className={`flex-1 py-4 text-xs uppercase tracking-widest text-white rounded-sm font-sans font-bold shadow-md transition-all ${
          !product.in_stock ? 'bg-gray-300 cursor-not-allowed' :
          added ? 'bg-green-600' : accentBg + ' hover:opacity-90'
        }`}
      >
        {!product.in_stock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Add to Cart'}
      </button>
    </div>
  );
}
