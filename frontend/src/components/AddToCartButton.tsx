"use client";

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { SOLD_OUT_LABEL } from '@/lib/product';
import type { NewCartLine } from '@/lib/cart-lines';

interface Props {
  /**
   * 담을 줄. 옵션이 필요한데 아직 고르지 않았으면 `null` — 버튼이 "옵션을
   * 골라 주세요"로 잠긴다.
   */
  line: NewCartLine | null;
  /** 품절이면 옵션을 골랐든 말든 잠긴다. */
  soldOut: boolean;
  /** 잠긴 이유를 설명하는 요소의 id(옵션 선택 안내). */
  describedBy?: string;
}

export default function AddToCartButton({ line, soldOut, describedBy }: Props) {
  // Selector, not the whole store: destructuring subscribes this button to
  // every cart change, so adding one item re-rendered every Add button on the
  // page. `addItem` is a stable reference, so this never re-renders at all.
  const addItem = useCartStore(state => state.addItem);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available = !soldOut && line !== null;

  const handleAddToCart = () => {
    if (!line || soldOut) return;
    addItem(line);
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

  const label = soldOut
    ? SOLD_OUT_LABEL
    : !line
    ? '옵션을 골라 주세요'
    : added
    ? '장바구니에 담았어요'
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
