"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/price';
import { MAX_LINE_QUANTITY } from '@/lib/cart-lines';

const EASE = [0.22, 1, 0.36, 1] as const;

// Server renders `false`, client renders `true` — a flash-free hydration gate
// with no effect/setState, so the persisted cart never flashes the empty state.
const noopSubscribe = () => () => {};

/** 줄을 지운 뒤 포커스를 보낼 곳. 다음 줄이 없으면 페이지 제목. */
const HEADING = Symbol('heading');

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const reduce = useReducedMotion();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // 포커스가 누른 버튼과 함께 사라지지 않게 한다.
  //
  // 줄을 지우면 그 줄의 "삭제" 버튼이 DOM에서 빠지고, 포커스는 <body>로
  // 떨어진다 — 키보드·스크린 리더 사용자는 페이지 맨 위에서 다시 찾아 내려와야
  // 했다. 지우기 전에 갈 곳(다음 줄, 없으면 이전 줄의 "삭제", 줄이 하나도 남지
  // 않으면 제목)을 정해 두고, 목록이 다시 그려진 뒤 옮긴다.
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | typeof HEADING | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    (target === HEADING ? headingRef.current : removeButtons.current.get(target))?.focus();
  }, [items]);

  const removeAt = (index: number) => {
    const next = items[index + 1] ?? items[index - 1];
    pendingFocus.current = next ? next.key : HEADING;
    removeItem(items[index].key);
  };

  if (!mounted) {
    return <main className="min-h-screen bg-canvas" aria-hidden />;
  }

  if (items.length === 0) return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center text-center px-8 py-24">
      <p className="eyebrow text-muted-foreground mb-4">Cart</p>
      {/* 빈 장바구니에도 제목은 있어야 한다. 담긴 게 있을 때의 "Ready to
          collect?"와 같은 자리다 (axe: page-has-heading-one). */}
      <h1 ref={headingRef} tabIndex={-1} className="font-serif text-3xl md:text-4xl tracking-tight text-ink mb-4">Your cart is empty.</h1>
      <p className="text-[15px] text-slate max-w-sm mb-8 break-keep">
        아직 담은 소품이 없어요. 자연에서 영감 받은 포스터와 라이프스타일 소품을 둘러보세요.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link href="/shop" className="btn-primary">소품 보러 가기</Link>
        <Link href="/archive" className="link-underline text-ink text-sm">아카이브 둘러보기</Link>
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
          <p className="eyebrow text-muted-foreground mb-3">Your Cart · {items.length} {items.length === 1 ? 'item' : 'items'}</p>
          <h1 ref={headingRef} tabIndex={-1} className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink">Ready to collect?</h1>
        </motion.header>

        {/* Line items */}
        <div className="mb-12">
          <AnimatePresence initial={false}>
            {/* 줄의 열쇠는 상품 id가 아니라 `key`(상품 + 옵션)다. 같은 포스터의
                A3와 A2가 한 줄로 합쳐지면 안 된다(`lib/cart-lines.ts`). */}
            {items.map((item, index) => {
              const atMin = item.quantity <= 1;
              const atMax = item.quantity >= MAX_LINE_QUANTITY;
              return (
              <motion.div
                key={item.key}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 border-b border-hairline py-5 overflow-hidden"
              >
                {/* Image — 높이만 맞추고 폭은 사진 비율대로. 정사각에 채워
                    자르지 않는다(DESIGN.md § Image Treatment). 칸은 가장 넓은
                    가로 사진까지 받도록 폭만 예약한다. */}
                <Link
                  href={`/shop/${item.id}`}
                  className="flex w-24 md:w-28 shrink-0 justify-center"
                >
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={0}
                      height={0}
                      sizes="112px"
                      className="h-20 md:h-24 w-auto max-w-full rounded-md border border-border-light bg-stone transition-colors hover:border-accent"
                    />
                  )}
                </Link>

                {/* Name + unit price */}
                <div className="flex-1 min-w-0 basis-[40%] sm:basis-auto">
                  <Link href={`/shop/${item.id}`} className="text-[15px] font-medium text-ink-body leading-snug hover:text-accent transition-colors">
                    {item.name}
                  </Link>
                  {item.option_label && (
                    <p className="mt-0.5 text-[13px] text-slate">{item.option_label}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-accent tabular-nums">{formatPrice(item.price)}</p>
                </div>

                {/* Quantity
                    `disabled`가 아니라 `aria-disabled` + 이른 return. 1까지
                    줄이는 순간 누르고 있던 버튼이 disabled가 되면 포커스가
                    <body>로 떨어져, 키보드로는 옆의 "+"조차 다시 찾아가야 했다.
                    aria-disabled는 포커스를 남긴 채 "사용할 수 없음"만 알린다. */}
                <div className="flex items-center gap-2 order-3 sm:order-none">
                  <button
                    type="button"
                    onClick={() => { if (!atMin) updateQuantity(item.key, item.quantity - 1); }}
                    aria-disabled={atMin}
                    aria-label={`${item.name} 수량 줄이기`}
                    className="w-9 h-9 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent aria-disabled:opacity-40 aria-disabled:hover:border-hairline aria-disabled:hover:text-slate aria-disabled:cursor-not-allowed transition-colors text-lg leading-none flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    −
                  </button>
                  {/* 바뀐 수량을 읽어 준다. 숫자만 들리지 않도록 상품명을 숨겨 붙인다. */}
                  <span role="status" className="text-sm font-semibold w-6 text-center tabular-nums">
                    <span className="sr-only">{item.name} 수량 </span>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => { if (!atMax) updateQuantity(item.key, item.quantity + 1); }}
                    aria-disabled={atMax}
                    aria-label={`${item.name} 수량 늘리기`}
                    className="w-9 h-9 rounded-md border border-hairline text-slate hover:border-accent hover:text-accent aria-disabled:opacity-40 aria-disabled:hover:border-hairline aria-disabled:hover:text-slate aria-disabled:cursor-not-allowed transition-colors text-lg leading-none flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    +
                  </button>
                </div>

                {/* Line subtotal + remove */}
                <div className="text-right min-w-[88px] order-4 sm:order-none ml-auto sm:ml-0">
                  <p className="text-sm font-semibold text-ink-body tabular-nums">
                    ₩&nbsp;{(item.price * item.quantity).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    ref={el => {
                      if (el) removeButtons.current.set(item.key, el);
                      else removeButtons.current.delete(item.key);
                    }}
                    onClick={() => removeAt(index)}
                    aria-label={`${item.name} 삭제`}
                    className="label-ko text-muted-foreground hover:text-brick transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {confirmingClear ? (
            <span className="flex items-center gap-3 text-sm text-slate">
              모두 비울까요?
              <button onClick={() => { pendingFocus.current = HEADING; clearCart(); setConfirmingClear(false); }} className="label-ko text-brick hover:opacity-70 transition-opacity">
                비우기
              </button>
              <button onClick={() => setConfirmingClear(false)} className="label-ko text-muted-foreground hover:text-ink transition-colors">
                취소
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="label-ko text-muted-foreground hover:text-slate transition-colors"
            >
              모두 비우기
            </button>
          )}

          <div className="w-full md:w-auto rounded-lg surface-cream p-6 md:min-w-[280px]">
            <div className="flex items-baseline justify-between mb-5">
              <span className="eyebrow text-slate">Total</span>
              <span className="text-2xl font-semibold text-ink tabular-nums" aria-live="polite">
                ₩&nbsp;{totalPrice().toLocaleString()}
              </span>
            </div>
            <Link href="/cart/checkout" className="btn-primary w-full">
              주문하기
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
