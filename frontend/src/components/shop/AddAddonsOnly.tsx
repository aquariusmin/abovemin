"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useCartStore } from '@/store/cartStore';
import { hasParentLine, type NewCartLine } from '@/lib/cart-lines';

// 서버·첫 렌더는 `false`: 장바구니는 브라우저 값이라 이 관문 없이 읽으면 하이드레이션이 어긋난다.
const noopSubscribe = () => () => {};

interface Props {
  productId: number;
  productName: string;
  extras: ReadonlyArray<{ line: NewCartLine; quantity: number }>;
  onAdded: () => void;
}

/** 이 상품이 이미 장바구니에 있을 때만 나온다. 부모 없는 추가 상품 줄은 `addLines`가 거른다. */
export default function AddAddonsOnly({ productId, productName, extras, onAdded }: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const parentInBag = useCartStore(state => hasParentLine(state.items, productId));
  const addItems = useCartStore(state => state.addItems);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const offered = mounted && parentInBag && extras.length > 0;

  const handleAdd = () => {
    if (!offered) return;
    addItems(extras);
    onAdded();
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      {(offered || added) && (
        <div className="space-y-2">
          <p className="text-[13px] text-muted-foreground break-keep">
            이 상품은 이미 장바구니에 있습니다. 추가 상품만 따로 담을 수 있습니다.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            // `disabled`가 아니라 aria-disabled: 누른 직후 disabled가 되면 포커스가 <body>로 떨어진다.
            aria-disabled={added && !offered}
            className={`btn-outline w-full min-h-11 px-6 py-3 ${added ? 'border-moss bg-moss text-forest-black' : ''}`}
          >
            {added && <span aria-hidden className="text-base leading-none">✓</span>}
            {added ? '추가 상품을 담았습니다' : '추가 상품만 담기'}
          </button>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {added ? `${productName} 추가 상품을 장바구니에 담았습니다.` : ''}
      </span>
    </>
  );
}
