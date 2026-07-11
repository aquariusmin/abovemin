"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();

  if (items.length === 0) return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center text-center px-8">
      <p className="eyebrow text-muted mb-4">Cart</p>
      <p className="font-serif text-3xl md:text-4xl tracking-tight text-ink mb-8">Your cart is empty.</p>
      <Link href="/shop" className="btn-primary">Back to Shop</Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-canvas px-4 md:px-8 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="mb-10 md:mb-14 border-b border-hairline pb-6">
          <p className="eyebrow text-muted mb-3">Your Cart</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink">Ready to collect?</h1>
        </header>

        {/* Line items */}
        <div className="mb-12">
          {items.map(item => (
            <div
              key={item.id}
              className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 border-b border-hairline py-5"
            >
              {/* Image */}
              <Link
                href={`/shop/${item.id}`}
                className="w-20 h-20 md:w-24 md:h-24 rounded-md bg-stone border border-border-light overflow-hidden shrink-0 relative"
              >
                <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="96px" />
              </Link>

              {/* Name + unit price */}
              <div className="flex-1 min-w-0 basis-[40%] sm:basis-auto">
                <p className="text-[15px] font-medium text-ink-body leading-snug">{item.name}</p>
                <p className="mt-1 text-sm font-semibold text-accent">₩ {item.price.toLocaleString()}</p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2 order-3 sm:order-none">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent transition-all text-lg leading-none flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-sm font-semibold w-6 text-center tabular-nums">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                  className="w-8 h-8 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent transition-all text-lg leading-none flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Line subtotal + remove */}
              <div className="text-right min-w-[88px] order-4 sm:order-none ml-auto sm:ml-0">
                <p className="text-sm font-semibold text-ink-body tabular-nums">
                  ₩ {(item.price * item.quantity).toLocaleString()}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="eyebrow text-muted hover:text-coral transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <button
            onClick={clearCart}
            className="eyebrow text-muted hover:text-slate transition-colors"
          >
            Clear All
          </button>

          <div className="w-full md:w-auto rounded-lg bg-stone p-6 md:min-w-[280px]">
            <div className="flex items-baseline justify-between mb-5">
              <span className="eyebrow text-muted">Total</span>
              <span className="text-2xl font-semibold text-ink tabular-nums">
                ₩ {totalPrice().toLocaleString()}
              </span>
            </div>
            <Link href="/cart/checkout" className="btn-primary w-full">
              Checkout
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
