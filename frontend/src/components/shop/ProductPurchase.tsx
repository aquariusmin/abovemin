"use client";

import { useId, useState } from 'react';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import { formatPrice, formatPriceRange } from '@/lib/price';
import { MAX_LINE_QUANTITY } from '@/lib/cart-lines';
import { isAddonAvailable, isOptionAvailable, SOLD_OUT_LABEL, type ProductAddon, type ProductOption } from '@/lib/product';
import AddAddonsOnly from './AddAddonsOnly';
import QuantityStepper from './QuantityStepper';

interface Props {
  product: {
    id: number;
    name: string;
    price: number;
    image_url: string;
  };
  options: ProductOption[];
  addons: ProductAddon[];
  priceMin: number;
  priceMax: number;
  soldOut: boolean;
  /** 살 수 있는 상품이 이것 하나뿐 — 장바구니를 건너뛰고 "바로 주문하기"로 주문서에 간다. */
  directOrder?: boolean;
}

/** 옵션은 기본값을 골라 두지 않는다(A4가 골라진 채 담으면 A2를 샀다고 믿는다). 하나뿐일 때만 골라 둔다. */
export default function ProductPurchase({ product, options, addons, priceMin, priceMax, soldOut, directOrder = false }: Props) {
  const hasOptions = options.length > 0;
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    options.length === 1 && isOptionAvailable(options[0]) ? options[0].id : null,
  );
  const selected = options.find(option => option.id === selectedId) ?? null;
  const groupId = useId();
  const hintId = `${groupId}-hint`;
  const [addonQuantity, setAddonQuantity] = useState<Record<string, number>>({});
  const showAddons = addons.length > 0 && !soldOut;

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

  // 고른 추가 상품 → 같이 담을 줄. 가격은 표시용이다.
  const extras = showAddons
    ? addons
        .filter(addon => isAddonAvailable(addon) && (addonQuantity[addon.id] ?? 0) > 0)
        .map(addon => ({
          line: {
            id: product.id,
            option_id: null,
            option_label: null,
            addon_id: addon.id,
            addon_label: addon.label,
            name: product.name,
            price: addon.price,
            image_url: '',
          },
          quantity: addonQuantity[addon.id],
        }))
    : [];
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.line.price * extra.quantity, 0);

  return (
    <div className="space-y-6">
      {/* 옵션을 고르면 이 줄이 그 옵션의 가격으로 바뀐다(aria-live로 알린다). */}
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
                    'relative inline-flex items-baseline gap-2 rounded-[var(--radius-pill)] border px-4 py-2.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200',
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
                  <span className={`text-[13px] tabular-nums ${disabled ? '' : 'opacity-75'}`}>
                    {option.in_stock ? formatPrice(option.price) : SOLD_OUT_LABEL}
                  </span>
                </label>
              );
            })}
          </div>
          <p id={hintId} className="text-[13px] text-muted-foreground">
            {soldOut
              ? '모든 옵션이 품절입니다.'
              : selected
              ? `${selected.label} 선택됨`
              : '옵션을 먼저 골라 주세요.'}
          </p>
        </fieldset>
      )}

      {showAddons && (
        <fieldset className="space-y-1">
          <legend className="label-ko text-muted-foreground mb-2">추가 상품</legend>
          <ul className="border-t border-hairline">
            {addons.map(addon => {
              const available = isAddonAvailable(addon);
              return (
                <li key={addon.id} className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline py-2">
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium leading-snug break-keep ${available ? 'text-ink-body' : 'text-muted-foreground'}`}>
                      {addon.label}
                    </p>
                    <p className="text-[13px] tabular-nums text-muted-foreground">
                      {!addon.in_stock ? SOLD_OUT_LABEL : addon.price > 0 ? `+ ${formatPrice(addon.price)}` : formatPrice(addon.price)}
                    </p>
                  </div>
                  {available && (
                    <QuantityStepper
                      name={addon.label}
                      value={addonQuantity[addon.id] ?? 0}
                      min={0}
                      max={MAX_LINE_QUANTITY}
                      onChange={next => setAddonQuantity(prev => ({ ...prev, [addon.id]: next }))}
                      className="shrink-0"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="pt-2 text-[13px] text-muted-foreground">
            {extras.length === 0
              ? `수량을 정하면 이 상품과 함께 ${directOrder ? '주문됩니다' : '담깁니다'}.`
              : line
              ? `추가 상품을 더해 ${formatPrice(line.price + extrasTotal)}`
              : `추가 상품 ${formatPrice(extrasTotal)} · 옵션을 고르면 함께 ${directOrder ? '주문됩니다' : '담깁니다'}.`}
          </p>
        </fieldset>
      )}

      <AddToCartButton
        line={line}
        soldOut={soldOut}
        describedBy={hasOptions ? hintId : undefined}
        extras={extras}
        onAdded={() => setAddonQuantity({})}
        directOrder={directOrder}
      />

      {/* 이 상품이 이미 장바구니에 있을 때만 나타난다 — 추가 상품 줄은 혼자 담기지 않는다. */}
      {showAddons && !directOrder && (
        <AddAddonsOnly
          productId={product.id}
          productName={product.name}
          extras={extras}
          onAdded={() => setAddonQuantity({})}
        />
      )}

      <div className="flex items-center gap-5 pt-1">
        {!soldOut && !directOrder && (
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
