"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useCartStore } from '@/store/cartStore';
import { hasParentLine, type NewCartLine } from '@/lib/cart-lines';

// 서버와 첫 클라이언트 렌더는 `false`, 그 뒤로 `true` — 장바구니 페이지와 같은
// 관문이다(`app/cart/page.tsx`). 장바구니는 브라우저에 저장된 값이라 서버 HTML이
// 알 수 없고, 이 관문 없이 읽으면 하이드레이션이 어긋난다.
const noopSubscribe = () => () => {};

interface Props {
  productId: number;
  productName: string;
  /** 지금 고른 추가 상품 줄들. 비어 있으면 이 자리에는 아무것도 없다. */
  extras: ReadonlyArray<{ line: NewCartLine; quantity: number }>;
  /** 담은 직후 — 고른 수량을 되돌린다(같이 담기와 같다). */
  onAdded: () => void;
}

/**
 * "추가 상품만 담기" — 이 상품이 **이미 장바구니에 있을 때만** 나온다.
 *
 * 추가 상품은 혼자 주문할 수 없어서 보통은 상품과 함께 담긴다. 그런데 달력을
 * 먼저 담아 둔 손님이 나중에 거치대를 더하려면 달력을 한 번 더 담았다가
 * 장바구니에서 수량을 줄여야 했다. 부모 줄이 이미 있으면 추가 상품 줄이 기댈
 * 곳이 있으니 그것만 담아도 된다 — 옵션을 다시 고를 필요도 없다(추가 상품은
 * 옵션이 아니라 상품에 붙는다).
 *
 * 큰 "장바구니에 담기" **아래**에 놓는다: 나타나고 사라져도 주 버튼이 움직이지
 * 않는다. 주 버튼은 그대로 상품 + 추가 상품을 담는다.
 *
 * 부모가 그사이 사라진 뒤의 늦은 클릭은 장바구니가 거른다 — `addLines`는 부모
 * 없는 추가 상품 줄을 담지 않는다(`lib/cart-lines.ts`).
 */
export default function AddAddonsOnly({ productId, productName, extras, onAdded }: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // 불리언만 구독한다 — 다른 상품을 담고 빼는 것으로는 다시 그리지 않는다.
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
      {/* 담고 나면 고른 수량이 0으로 돌아가 이 자리가 사라진다. 담았다는 표시는
          주 버튼처럼 1.5초 남긴다 — 누른 버튼이 말없이 없어지면 실패로 읽힌다. */}
      {(offered || added) && (
        <div className="space-y-2">
          <p className="text-[13px] text-muted-foreground break-keep">
            이 상품은 이미 장바구니에 있어요. 추가 상품만 더 담을 수도 있어요.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            // `disabled`가 아니라 aria-disabled: 누른 직후 버튼이 disabled가 되면
            // 포커스가 <body>로 떨어진다(`QuantityStepper`와 같은 이유).
            aria-disabled={added && !offered}
            className={`btn-outline w-full min-h-11 px-6 py-3 ${added ? 'border-moss bg-moss text-forest-black' : ''}`}
          >
            {added && <span aria-hidden className="text-base leading-none">✓</span>}
            {added ? '추가 상품을 담았어요' : '추가 상품만 담기'}
          </button>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {added ? `${productName} 추가 상품을 장바구니에 담았습니다.` : ''}
      </span>
    </>
  );
}
