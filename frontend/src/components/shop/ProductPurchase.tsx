"use client";

import { useId, useState } from 'react';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import { formatPrice, formatPriceRange } from '@/lib/price';
import { isOptionAvailable, SOLD_OUT_LABEL, type ProductOption } from '@/lib/product';

interface Props {
  product: {
    id: number;
    name: string;
    price: number;
    image_url: string;
  };
  options: ProductOption[];
  priceMin: number;
  priceMax: number;
  soldOut: boolean;
}

/**
 * 상세 페이지의 "사는 부분" — 가격, 옵션, 담기 버튼.
 *
 * 옵션이 있는 상품은 옵션을 **반드시** 고른다. 기본값을 미리 골라 두지 않는
 * 이유: 가장 싼 A4가 골라진 채로 "담기"를 누른 손님은 A2를 샀다고 믿는다.
 * 옵션이 하나뿐이고 살 수 있을 때만 그것을 골라 둔다 — 고를 것이 없는 선택은
 * 질문이 아니다.
 *
 * 선택지는 네이티브 라디오다. 방향키로 옮겨 다니고, 품절(disabled)은 건너뛰고,
 * 스크린리더가 "3개 중 2번째"를 읽는 것까지 브라우저가 해 준다 — 알약 모양은
 * 라벨이 입는다.
 */
export default function ProductPurchase({ product, options, priceMin, priceMax, soldOut }: Props) {
  const hasOptions = options.length > 0;
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    options.length === 1 && isOptionAvailable(options[0]) ? options[0].id : null,
  );
  const selected = options.find(option => option.id === selectedId) ?? null;
  const groupId = useId();
  const hintId = `${groupId}-hint`;

  const priceText = selected
    ? formatPrice(selected.price)
    : hasOptions
    ? formatPriceRange({ min: priceMin, max: priceMax })
    : formatPrice(product.price);
  const priced = selected ? selected.price > 0 : priceMin > 0;

  const line =
    soldOut || (hasOptions && !selected)
      ? null
      : {
          id: product.id,
          option_id: selected?.id ?? null,
          option_label: selected?.label ?? null,
          name: product.name,
          // 표시용이다. 주문 API는 이 값을 받지 않고 DB의 옵션 가격을 쓴다.
          price: selected ? selected.price : product.price,
          image_url: product.image_url,
        };

  return (
    <div className="space-y-6">
      {/* 이름이 이 페이지의 제목이고 가격은 그 아래의 정보다 — 초록 굵은
          2xl이면 "가격 미정"이 제목처럼 읽힌다. 옵션을 고르면 이 줄이 그
          옵션의 가격으로 바뀐다(aria-live로 알린다). */}
      <p
        aria-live="polite"
        className={`text-lg tabular-nums ${priced && !soldOut ? 'font-medium text-ink-body' : 'text-muted-foreground'}`}
      >
        {priceText}
      </p>

      {hasOptions && (
        <fieldset role="radiogroup" aria-required="true" aria-describedby={hintId} className="space-y-3">
          <legend className="eyebrow text-muted-foreground mb-3">Options</legend>
          <div className="flex flex-wrap gap-2">
            {options.map(option => {
              const disabled = soldOut || !isOptionAvailable(option);
              return (
                <label
                  key={option.id}
                  className={[
                    'relative inline-flex items-baseline gap-2 rounded-[var(--radius-pill)] border px-4 py-2.5 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-200',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                    disabled
                      ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                      : 'cursor-pointer border-border bg-card text-ink shadow-xs hover:-translate-y-px hover:border-forest/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:shadow-none',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name={groupId}
                    value={option.id}
                    checked={selectedId === option.id}
                    disabled={disabled}
                    onChange={() => setSelectedId(option.id)}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                  {/* 품절 옵션은 가격 대신 상태를 적는다 — 흐린 가격만으로는 왜
                      못 고르는지 알 수 없다. 재고는 있는데 가격이 0원이면
                      `formatPrice`가 "가격 미정"을 적는다. */}
                  <span className={`text-[12px] tabular-nums ${disabled ? '' : 'opacity-75'}`}>
                    {option.in_stock ? formatPrice(option.price) : SOLD_OUT_LABEL}
                  </span>
                </label>
              );
            })}
          </div>
          <p id={hintId} className="text-[13px] text-muted-foreground">
            {soldOut
              ? '모든 옵션이 품절되었어요.'
              : selected
              ? `${selected.label}을(를) 골랐어요.`
              : '옵션을 먼저 골라 주세요.'}
          </p>
        </fieldset>
      )}

      <AddToCartButton line={line} soldOut={soldOut} describedBy={hasOptions ? hintId : undefined} />

      {/* 담을 수 없는 상품에서 "장바구니 보기"는 갈 이유가 없는 길이다. */}
      <div className="flex items-center gap-5 pt-1">
        {!soldOut && (
          <Link href="/cart" className="link-underline text-sm text-slate">
            장바구니 보기 →
          </Link>
        )}
        <Link href="/shop" className="link-underline text-sm text-slate">
          계속 둘러보기
        </Link>
      </div>
    </div>
  );
}
