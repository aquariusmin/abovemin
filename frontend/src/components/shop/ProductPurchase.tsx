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
  /** 이 상품에만 딸린 추가 상품. 없으면(마이그레이션 전 포함) 이 구역이 통째로 없다. */
  addons: ProductAddon[];
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
 *
 * 추가 상품은 옵션과 반대다: 고르지 않아도 되고 여러 개를 담을 수 있다. 그래서
 * 라디오가 아니라 0에서 시작하는 수량이고, "담기"가 상품 줄과 고른 추가 상품을
 * 한 번에 담는다. 추가 상품은 옵션이 아니라 상품에 붙는다 — 옵션을 바꿔도 고른
 * 수량은 그대로다. 품절인 추가 상품은 보이되 고를 수 없다. 상품 자체가 품절이면
 * 살 수 있는 것이 없으므로 구역을 그리지 않는다.
 *
 * 이 상품이 이미 장바구니에 있으면 고른 추가 상품**만** 담는 길이 하나 더 생긴다
 * (`AddAddonsOnly`). 장바구니에 없을 때는 아무것도 달라지지 않는다.
 */
export default function ProductPurchase({ product, options, addons, priceMin, priceMax, soldOut }: Props) {
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

  // 고른 추가 상품 → 같이 담을 줄. 이름은 부모 상품의 이름이고, 가격은 표시용이다.
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

      {showAddons && (
        <fieldset className="space-y-1">
          {/* 손님이 읽고 고르는 말이라 한국어다 — Hangul은 eyebrow의 대문자·자간을
              받지 않으므로 label-ko. */}
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
                  {/* 살 수 없는 추가 상품에는 수량 버튼을 두지 않는다 — 왜 못
                      고르는지는 가격 자리의 "품절"(또는 "가격 미정")이 말한다. */}
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
              ? '필요한 만큼 수량을 올리면 이 상품과 함께 담겨요.'
              : line
              ? `추가 상품을 더해 ${formatPrice(line.price + extrasTotal)}`
              : `추가 상품 ${formatPrice(extrasTotal)} · 옵션을 고르면 함께 담겨요.`}
          </p>
        </fieldset>
      )}

      <AddToCartButton
        line={line}
        soldOut={soldOut}
        describedBy={hasOptions ? hintId : undefined}
        extras={extras}
        onAdded={() => setAddonQuantity({})}
      />

      {/* 이 상품이 이미 장바구니에 있고 추가 상품을 골랐을 때만 나타난다. 주 버튼
          아래라 나타나도 주 버튼은 움직이지 않는다. 옵션을 고르지 않았어도 된다. */}
      {showAddons && (
        <AddAddonsOnly
          productId={product.id}
          productName={product.name}
          extras={extras}
          onAdded={() => setAddonQuantity({})}
        />
      )}

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
