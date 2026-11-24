"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { SOLD_OUT_LABEL } from '@/lib/product';
import type { NewCartLine } from '@/lib/cart-lines';

interface Props {
  line: NewCartLine | null;
  /** 상품 줄의 수량. 추가 상품 수량은 `extras`가 따로 갖는다. */
  quantity?: number;
  soldOut: boolean;
  describedBy?: string;
  /** 상품 줄과 한 번에 담긴다 — 추가 상품은 부모 줄 없이 장바구니에 들어가지 않는다(`lib/cart-lines.ts`). */
  extras?: ReadonlyArray<{ line: NewCartLine; quantity: number }>;
  onAdded?: () => void;
  /** 장바구니를 이 줄로 바꿔 놓고 체크아웃으로 보낸다 — 더하면 예전에 담은 수량이 몰래 늘어난다. */
  directOrder?: boolean;
}

export default function AddToCartButton({ line, quantity = 1, soldOut, describedBy, extras, onAdded, directOrder = false }: Props) {
  // Selector, not the whole store: destructuring re-rendered every Add button on each cart change.
  const addItems = useCartStore(state => state.addItems);
  const clearCart = useCartStore(state => state.clearCart);
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available = !soldOut && line !== null;

  const handleAddToCart = () => {
    if (!line || soldOut) return;
    if (directOrder) {
      clearCart();
      addItems([{ line, quantity }, ...(extras ?? [])]);
      router.push(`/cart/checkout?from=${line.id}`);
      return;
    }
    addItems([{ line, quantity }, ...(extras ?? [])]);
    onAdded?.();
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 py-4 text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,box-shadow] duration-200';
  const stateClass = !available
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added
    ? 'bg-moss text-forest-black'
    : 'bg-primary text-primary-foreground hover:bg-fern hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_var(--forest)] active:translate-y-0 active:shadow-none';

  const label = soldOut
    ? SOLD_OUT_LABEL
    : !line
    ? '옵션을 골라 주세요'
    : added
    ? '장바구니에 담았습니다'
    : directOrder
    ? '바로 주문하기'
    : '장바구니에 담기';

  const announced = line?.option_label ? `${line.name} ${line.option_label}` : line?.name;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!available}
        aria-describedby={!available && !soldOut ? describedBy : undefined}
        className={`${base} ${stateClass}`}
      >
        {added && (
          <span aria-hidden className="text-base leading-none">✓</span>
        )}
        {label}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${announced} 장바구니에 담았습니다.` : ''}
      </span>
    </div>
  );
}
