"use client";

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

const EASE = [0.22, 1, 0.36, 1] as const;

// Server renders `false`, client renders `true` — a flash-free hydration gate
// with no effect/setState, so the persisted cart never flashes the empty state.
const noopSubscribe = () => () => {};

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const reduce = useReducedMotion();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) {
    return <main className="min-h-screen bg-canvas" aria-hidden />;
  }

  if (items.length === 0) return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center text-center px-8 py-24">
      <p className="eyebrow text-muted mb-4">Cart</p>
      <p className="font-serif text-3xl md:text-4xl tracking-tight text-ink mb-4">Your cart is empty.</p>
      <p className="text-[15px] text-slate max-w-sm mb-8 break-keep">
        아직 담은 소품이 없어요. 자연에서 영감 받은 포스터와 라이프스타일 소품을 둘러보세요.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link href="/shop" className="btn-primary glass-btn">Explore the shop</Link>
        <Link href="/archive" className="link-underline text-ink text-sm">Browse the archive</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-canvas px-4 md:px-8 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.header
          className="mb-10 md:mb-14 border-b border-hairline pb-6"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p className="eyebrow text-muted mb-3">Your Cart · {items.length} {items.length === 1 ? 'item' : 'items'}</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink">Ready to collect?</h1>
        </motion.header>

        {/* Line items */}
        <div className="mb-12">
          <AnimatePresence initial={false}>
            {items.map(item => (
              <motion.div
                key={item.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 border-b border-hairline py-5 overflow-hidden"
              >
                {/* Image */}
                <Link
                  href={`/shop/${item.id}`}
                  className="w-20 h-20 md:w-24 md:h-24 glass rounded-xl overflow-hidden shrink-0 relative transition-colors hover:border-accent"
                >
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="96px" />
                </Link>

                {/* Name + unit price */}
                <div className="flex-1 min-w-0 basis-[40%] sm:basis-auto">
                  <Link href={`/shop/${item.id}`} className="text-[15px] font-medium text-ink-body leading-snug hover:text-accent transition-colors">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm font-semibold text-accent tabular-nums">₩ {item.price.toLocaleString()}</p>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2 order-3 sm:order-none">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-slate disabled:cursor-not-allowed transition-colors text-lg leading-none flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold w-6 text-center tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent transition-colors text-lg leading-none flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {confirmingClear ? (
            <span className="flex items-center gap-3 text-sm text-slate">
              모두 비울까요?
              <button onClick={() => { clearCart(); setConfirmingClear(false); }} className="eyebrow text-coral hover:opacity-70 transition-opacity">
                Yes, clear
              </button>
              <button onClick={() => setConfirmingClear(false)} className="eyebrow text-muted hover:text-ink transition-colors">
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="eyebrow text-muted hover:text-slate transition-colors"
            >
              Clear All
            </button>
          )}

          <div className="glass rounded-2xl w-full md:w-auto p-6 md:min-w-[280px]">
            <div className="flex items-baseline justify-between mb-5">
              <span className="eyebrow text-muted">Total</span>
              <span className="text-2xl font-semibold text-ink tabular-nums" aria-live="polite">
                ₩ {totalPrice().toLocaleString()}
              </span>
            </div>
            <Link href="/cart/checkout" className="btn-primary glass-btn w-full">
              Checkout
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
