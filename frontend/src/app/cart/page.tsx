"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/price';
import { cascadedAddons, isAddonLine, MAX_LINE_QUANTITY, removeLine } from '@/lib/cart-lines';
import { ADDON_LABEL } from '@/lib/product';
import QuantityStepper from '@/components/shop/QuantityStepper';

const EASE = [0.22, 1, 0.36, 1] as const;

// Server renders `false`, client renders `true` — a flash-free hydration gate
// with no effect/setState, so the persisted cart never flashes the empty state.
const noopSubscribe = () => () => {};

// 터치 영역은 40px, 보이는 모양은 그대로. 수량 버튼은 `QuantityStepper`에 있다.
//
// 글자 버튼(삭제·비우기·취소): 글줄은 18px이라 위아래 11px씩 키우고 같은 만큼
// 음수 마진으로 되돌린다. 좁은 것은 쓰는 자리에서 옆으로도 같은 식으로 넓힌다.
// 포커스 링은 넓어진 버튼이 아니라 글자를 감싼 <span>에 그린다 — 전역
// `:focus-visible`은 레이어 밖이라 `!`로만 끌 수 있다.
const TEXT_BUTTON = 'group label-ko inline-flex min-h-10 items-center -my-[11px] focus-visible:outline-none!';
const TEXT_BUTTON_FACE =
  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring';

/** 줄을 지운 뒤 포커스를 보낼 곳. 다음 줄이 없으면 페이지 제목. */
const HEADING = Symbol('heading');

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const reduce = useReducedMotion();
  const [confirmingClear, setConfirmingClear] = useState(false);
  // 상품의 마지막 줄을 지우면 그 상품의 추가 상품 줄도 같이 사라진다. 말없이
  // 두 줄이 없어지면 실수로 보이므로 무엇이 같이 빠졌는지 한 줄로 알린다.
  const [cascadeNotice, setCascadeNotice] = useState<string | null>(null);
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
    const { key, name } = items[index];
    // 같이 사라질 추가 상품 줄을 빼고 남는 줄 가운데서 갈 곳을 고른다 — 바로
    // 아래 줄이 방금 같이 지워진 추가 상품일 수 있다.
    const remaining = new Set(removeLine(items, key).map(item => item.key));
    const next = items.slice(index + 1).find(item => remaining.has(item.key))
      ?? items.slice(0, index).findLast(item => remaining.has(item.key));
    pendingFocus.current = next ? next.key : HEADING;
    const gone = cascadedAddons(items, key);
    setCascadeNotice(
      gone.length ? `${name}의 추가 상품(${gone.map(item => item.addon_label).join(', ')})도 함께 뺐어요.` : null,
    );
    removeItem(key);
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
              // 추가 상품 줄은 부모 줄 바로 아래에 온다(`lib/cart-lines.ts`). 사진
              // 자리를 비워 들여 쓰고 "추가" 칩을 달아, 위 상품에 딸린 줄로 읽히게 한다.
              const addon = isAddonLine(item);
              const lineName = addon ? `${item.name} ${ADDON_LABEL} ${item.addon_label}` : item.name;
              return (
              <motion.div
                key={item.key}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 border-b border-hairline overflow-hidden ${addon ? 'py-3' : 'py-5'}`}
              >
                {/* Image — 높이만 맞추고 폭은 사진 비율대로. 정사각에 채워
                    자르지 않는다(DESIGN.md § Image Treatment). 칸은 가장 넓은
                    가로 사진까지 받도록 폭만 예약한다. */}
                {addon ? (
                  <span aria-hidden className="w-6 md:w-28 shrink-0" />
                ) : (
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
                )}

                {/* Name + unit price */}
                <div className="flex-1 min-w-0 basis-[40%] sm:basis-auto">
                  {addon ? (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium text-ink-body leading-snug">
                      <span className="chip normal-case tracking-normal text-[11px] px-2 py-0.5">{ADDON_LABEL}</span>
                      {item.addon_label}
                    </p>
                  ) : (
                  <Link href={`/shop/${item.id}`} className="text-[15px] font-medium text-ink-body leading-snug hover:text-accent transition-colors">
                    {item.name}
                  </Link>
                  )}
                  {item.option_label && (
                    <p className="mt-0.5 text-[13px] text-slate">{item.option_label}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-accent tabular-nums">{formatPrice(item.price)}</p>
                </div>

                {/* Quantity — 1 아래로는 "삭제"가 한다. */}
                <QuantityStepper
                  name={lineName}
                  value={item.quantity}
                  min={1}
                  max={MAX_LINE_QUANTITY}
                  onChange={next => updateQuantity(item.key, next)}
                  className="order-3 sm:order-none"
                />

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
                    aria-label={`${lineName} 삭제`}
                    className={`${TEXT_BUTTON} -ml-5 pl-5 text-muted-foreground hover:text-brick transition-colors`}
                  >
                    <span className={TEXT_BUTTON_FACE}>삭제</span>
                  </button>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {cascadeNotice && (
          <p role="status" className="-mt-8 mb-8 text-[13px] text-slate">{cascadeNotice}</p>
        )}

        {/* Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {confirmingClear ? (
            <span className="flex items-center gap-3 text-sm text-slate">
              모두 비울까요?
              <button onClick={() => { pendingFocus.current = HEADING; clearCart(); setConfirmingClear(false); setCascadeNotice(null); }} className={`${TEXT_BUTTON} -ml-2 pl-2 text-brick hover:opacity-70 transition-opacity`}>
                <span className={TEXT_BUTTON_FACE}>비우기</span>
              </button>
              <button onClick={() => setConfirmingClear(false)} className={`${TEXT_BUTTON} -mx-2.5 px-2.5 text-muted-foreground hover:text-ink transition-colors`}>
                <span className={TEXT_BUTTON_FACE}>취소</span>
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className={`${TEXT_BUTTON} text-muted-foreground hover:text-slate transition-colors`}
            >
              <span className={TEXT_BUTTON_FACE}>모두 비우기</span>
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
