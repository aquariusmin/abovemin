"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackLink from '@/components/BackLink';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import type { OrderInputValues } from '@/lib/orders-schema';
import { isAddonLine, toOrderItems } from '@/lib/cart-lines';
import { ADDON_LABEL } from '@/lib/product';
import {
  clearPlacedOrder,
  placedOrderFromResponse,
  readPlacedOrder,
  writePlacedOrder,
  type PlacedOrder,
} from '@/lib/order-placed';
import { CONTACT_EMAIL } from '@/lib/site';
import AddressSearch from '@/components/shop/AddressSearch';
import { DELIVERY_LABEL, DELIVERY_METHODS, type DeliveryMethod } from '@/lib/delivery';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { items, totalPrice, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  // 완료 화면에 띄울 요약 — 있으면 완료 화면이다. 금액은 서버가 DB에서 다시
  // 계산한 합계다: 장바구니의 가격은 담을 때 본 값이라, 그 사이 가격이 바뀌었으면
  // 둘이 다르고 입금할 금액은 서버 쪽이다. `sessionStorage`에도 같이 적어 두어
  // 새로고침해도 이 화면이 남는다(`lib/order-placed.ts`).
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  // 방금 낸 주문에서만 안다(장바구니 합계는 저장하지 않는다). 새로고침 뒤에는 꺼진다.
  const [priceChanged, setPriceChanged] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', zipcode: '', address: '', addressDetail: '', note: '', website: '' });
  // 택배가 기본이다. 대면 전달이면 주소 칸을 통째로 감추고 보내지 않는다.
  const [delivery, setDelivery] = useState<DeliveryMethod>('parcel');
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [orderError, setOrderError] = useState<string | null>(null);
  // 주문 시도 하나에 키 하나. 실패 후 다시 누르거나 응답이 끊겨 다시 보내도 같은
  // 키가 가므로, 첫 요청이 사실은 저장됐다면 서버는 새로 넣지 않고 그 주문으로
  // 답한다. 새 키는 주문이 성공한 뒤에만 만든다.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const [mounted, setMounted] = useState(false);
  // 상품 상세의 "바로 주문하기"로 왔으면(`?from=상품 id`) 돌아가는 곳은 장바구니가
  // 아니라 그 상품이다. 장바구니를 거치지 않았으니까.
  const [fromProduct, setFromProduct] = useState<number | null>(null);

  useEffect(() => {
    // 장바구니가 비어 있는데 방금 낸 주문의 요약이 남아 있다: 완료 화면에서
    // 새로고침한 것이다. 장바구니에 무언가 담겨 있으면 새 주문을 하러 온 것이니
    // 지난 요약은 치운다.
    if (useCartStore.getState().items.length === 0) setPlaced(readPlacedOrder());
    else clearPlacedOrder();
    // useSearchParams 대신 직접 읽는다 — 그 훅은 이 정적 페이지를 Suspense 경계로
    // 감싸게 만든다. 값은 돌아가기 링크 하나에만 쓴다.
    const from = Number(new URLSearchParams(window.location.search).get('from'));
    if (Number.isSafeInteger(from) && from > 0) setFromProduct(from);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !placed) {
      router.replace('/cart');
    }
  }, [mounted, items.length, placed, router]);

  if (!mounted || (items.length === 0 && !placed)) return null;

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = '이름을 입력해주세요';
    if (!form.phone.trim()) e.phone = '연락처를 입력해주세요';
    else if (form.phone.replace(/\D/g, '').length < 9) e.phone = '연락처를 확인해주세요';
    if (delivery === 'parcel' && !form.address.trim()) e.address = '주소를 입력해주세요';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOrderError(null);
    const e2 = validate();
    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      // Move focus to the first invalid field for keyboard/screen-reader users.
      const firstError = Object.keys(e2)[0];
      document.getElementById(firstError)?.focus();
      return;
    }
    setSubmitting(true);

    // Typed against the schema the server parses with, on purpose.
    //
    // This is the compile-time half of the fix for the dropped postal code: an
    // object literal annotated with `OrderInputValues` cannot carry a key the
    // schema does not declare, so adding a field to this form without adding
    // it to `orders-schema` fails the build instead of being silently stripped
    // at runtime. `total_price` is gone for the same reason — the server has
    // always recomputed it from the products table, and sending it suggested
    // otherwise.
    //
    // 항목도 같은 이유로 id·옵션 id·수량만 싣는다(`toOrderItems`). 장바구니 줄의
    // 가격은 화면 표시용이고, 서버는 옵션 가격까지 DB에서 다시 읽는다. 추가 상품
    // 줄은 `{ id: 부모 상품, addon_id, quantity }`로 나가고, 이름과 가격은 역시
    // 서버가 `products.addons`에서 읽는다.
    const payload: OrderInputValues = {
      name: form.name.trim(),
      // 이메일은 받지 않는다 — 연락은 전화로 한다(`orders-schema.ts`).
      phone: form.phone.trim(),
      delivery_method: delivery,
      // 대면 전달이면 적다 만 주소가 있어도 보내지 않는다.
      zipcode: delivery === 'parcel' ? form.zipcode.trim() || null : null,
      // 기본 주소(검색 결과)와 상세 주소(동·호수)는 칸만 나뉘고 저장은 한 줄이다.
      address: delivery === 'parcel' ? [form.address.trim(), form.addressDetail.trim()].filter(Boolean).join(' ') : '',
      note: form.note.trim() || null,
      items: toOrderItems(items),
      idempotency_key: idempotencyKey,
      // 허니팟 — 사람에게는 늘 빈 칸이다. 비었으면 키째 뺀다.
      ...(form.website ? { website: form.website } : {}),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // The server distinguishes its failures — a sold-out item, an item that
        // no longer exists, too many attempts — and a blanket "try again later"
        // hides all of them. Worse, it invites a retry loop for the one case
        // that retrying can never fix: a product that went out of stock while
        // it sat in this cart. Show what the server said, and fall back to the
        // generic line only when it said nothing useful.
        const detail = await res
          .json()
          .then((body: unknown) =>
            typeof (body as { error?: unknown })?.error === 'string'
              ? (body as { error: string }).error
              : null,
          )
          .catch(() => null);
        setOrderError(
          detail ??
            (res.status === 429
              ? '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.'
              : '주문을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
        );
        setSubmitting(false);
        return;
      }

      const cartTotal = totalPrice();
      const body: unknown = await res.json().catch(() => null);
      const order = placedOrderFromResponse(body, { cartTotal });
      writePlacedOrder(order);
      setPriceChanged(order.total !== cartTotal);
      setPlaced(order);
      clearCart();
      setIdempotencyKey(crypto.randomUUID());
      // 제출 버튼은 폼의 맨 아래다. 그 스크롤 위치에 완료 화면이 그대로 뜨면
      // 주문번호와 금액이 화면 위로 밀려나 있다.
      window.scrollTo(0, 0);
    } catch {
      setOrderError('네트워크 오류로 주문을 보내지 못했습니다. 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <main
        className="min-h-screen bg-canvas flex flex-col items-center justify-center text-center px-8 py-24"
        aria-live="polite"
      >
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl mb-8"
        >
          <span aria-hidden>✓</span>
        </motion.div>
        <p className="eyebrow text-muted-foreground mb-4">Order Placed</p>
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink mb-4">주문을 받았습니다.</h1>
        <p className="text-[15px] text-ink-body mb-8 break-keep">
          아래 계좌로 입금해 주세요. 확인되면 적어 주신 연락처로 알려 드립니다.
        </p>

        {/* 메일을 보내지 않으므로 손님이 받는 안내는 이 화면이 전부다: 번호, 금액, 계좌. */}
        <dl className="w-full max-w-sm rounded-lg surface-cream p-6 space-y-4 text-left">
          {placed.orderId !== null && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="label-ko text-slate">주문번호</dt>
              <dd className="text-sm font-semibold text-ink tabular-nums">#{placed.orderId}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-ko text-slate">입금하실 금액</dt>
            <dd className="text-xl font-semibold text-ink tabular-nums">₩&nbsp;{placed.total.toLocaleString()}</dd>
          </div>
          <div className="border-t border-hairline pt-4">
            <dt className="label-ko text-slate">입금 계좌</dt>
            {placed.bankInfo ? (
              <dd className="mt-1 text-[15px] font-semibold text-ink">{placed.bankInfo}</dd>
            ) : (
              <dd className="mt-1 text-sm text-ink-body">적어 주신 연락처로 알려 드립니다.</dd>
            )}
          </div>
        </dl>
        {priceChanged && (
          <p className="mt-3 max-w-md text-xs text-brick">
            장바구니에 담은 뒤 가격이 바뀌었습니다. 위 금액(₩&nbsp;{placed.total.toLocaleString()})으로 입금해 주세요.
          </p>
        )}
        <p className="mt-6 mb-10 max-w-sm text-[13px] text-slate leading-relaxed">
          이 화면을 저장해 두세요. 문제가 있으면{placed.orderId !== null && ' 주문번호와 함께'}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-leaf">{CONTACT_EMAIL}</a>으로 알려 주세요.
        </p>
        {/* 이 화면을 스스로 떠날 때 요약을 지운다. 지우지 않으면 빈 장바구니로
            체크아웃 주소에 다시 올 때마다 지난 주문이 뜬다. */}
        <Link href="/shop" className="btn-primary" onClick={() => clearPlacedOrder()}>계속 둘러보기</Link>
      </main>
    );
  }

  const inputClass = "field-input";
  const labelClass = "field-label";
  const errorClass = "mt-1.5 text-xs text-brick";

  return (
    <main className="min-h-screen bg-canvas px-4 md:px-8 py-12 md:py-20">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >

        <header className="mb-10 border-b border-hairline pb-6">
          {fromProduct !== null ? (
            <BackLink href={`/shop/${fromProduct}`}>상품으로</BackLink>
          ) : (
            <BackLink href="/cart">장바구니로</BackLink>
          )}
          <p className="eyebrow text-muted-foreground mt-6 mb-3">Checkout</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink">주문 정보를 입력해 주세요.</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">

          {/* Order form. `noValidate`는 검증과 문구를 우리가 하기 위해서고, 필수 칸의
              `required`는 그와 별개로 브라우저·자동완성·보조기기에 "필수"를 알린다. */}
          <form onSubmit={handleSubmit} noValidate className="md:col-span-7 space-y-6">
            <div>
              <label htmlFor="name" className={labelClass}>이름 *</label>
              <input
                id="name"
                className={inputClass}
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }}
                placeholder="홍길동"
                autoComplete="name"
                required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>연락처 *</label>
              <input
                id="phone"
                className={inputClass}
                type="tel"
                value={form.phone}
                onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(er => ({ ...er, phone: undefined })); }}
                placeholder="010-0000-0000"
                autoComplete="tel"
                inputMode="tel"
                required
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && <p id="phone-error" className={errorClass}>{errors.phone}</p>}
            </div>

            {/* 수령 방법. 네이티브 라디오라 방향키로 옮기고 스크린리더가 "2개 중 1번째"를
                읽는다 — 알약 모양은 라벨이 입는다(상품 옵션과 같은 모양). */}
            <fieldset>
              <legend className={labelClass}>받는 방법 *</legend>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_METHODS.map(method => (
                  <label
                    key={method}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-pill)] border border-field-edge bg-card px-5 text-[14px] font-medium text-ink transition-[background-color,border-color,color] duration-200 hover:border-forest/60 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={method}
                      checked={delivery === method}
                      onChange={() => { setDelivery(method); setErrors(er => ({ ...er, address: undefined })); }}
                      className="sr-only"
                    />
                    {DELIVERY_LABEL[method]}
                  </label>
                ))}
              </div>
              {delivery === 'pickup' && (
                <p className="mt-2 text-xs text-slate leading-relaxed">
                  추후 연락드리겠습니다.
                </p>
              )}
            </fieldset>

            {delivery === 'parcel' && (
            <>
            {/* 주소: 우편번호 + 기본 주소는 "주소 찾기"(카카오 우편번호)가 채우고,
                동·호수는 손님이 적는다. 검색을 못 쓰는 경우(스크립트 차단 등)에도
                주문할 수 있도록 세 칸 모두 직접 적을 수 있다. 저장은 기본 주소와
                상세 주소를 공백으로 이은 한 줄이다(`handleSubmit`). */}
            <fieldset className="space-y-3">
              <legend className={labelClass}>배송 주소 *</legend>
              <div className="flex gap-2">
                <label htmlFor="zipcode" className="sr-only">우편번호</label>
                <input
                  id="zipcode"
                  className={`${inputClass} min-w-0 flex-1`}
                  value={form.zipcode}
                  onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))}
                  placeholder="우편번호"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={5}
                />
                <AddressSearch
                  onSelect={({ zipcode, address }) => {
                    setForm(f => ({ ...f, zipcode, address }));
                    setErrors(er => ({ ...er, address: undefined }));
                    // 남은 일은 동·호수 — 커서를 거기로.
                    requestAnimationFrame(() => document.getElementById('addressDetail')?.focus());
                  }}
                />
              </div>
              <div>
                <label htmlFor="address" className="sr-only">기본 주소</label>
                <input
                  id="address"
                  className={inputClass}
                  value={form.address}
                  onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrors(er => ({ ...er, address: undefined })); }}
                  placeholder="기본 주소"
                  autoComplete="address-line1"
                  required
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                />
                {errors.address && <p id="address-error" className={errorClass}>{errors.address}</p>}
              </div>
              <div>
                <label htmlFor="addressDetail" className="sr-only">상세 주소</label>
                <input
                  id="addressDetail"
                  className={inputClass}
                  value={form.addressDetail}
                  onChange={e => setForm(f => ({ ...f, addressDetail: e.target.value }))}
                  placeholder="상세 주소 (동·호수)"
                  autoComplete="address-line2"
                />
              </div>
            </fieldset>
            </>
            )}

            <div>
              <label htmlFor="note" className={labelClass}>메모</label>
              <textarea
                id="note"
                className={`${inputClass} resize-none`}
                rows={3}
                autoComplete="off"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="전할 말이 있으면 적어 주세요"
              />
            </div>

            {/* 허니팟. 사람에게는 보이지도, 읽히지도, 탭으로 닿지도 않는다 —
                폼을 통째로 채우는 봇만 여기에 값을 넣는다. `display:none`이
                아닌 이유: 그건 봇도 건너뛴다. 서버는 채워진 주문을 성공처럼
                답하고 버린다(`api/orders`). */}
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="website">웹사이트</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              />
            </div>

            {orderError && (
              <p
                role="alert"
                className="rounded-md border border-brick/40 bg-brick/[0.06] px-4 py-3 text-sm text-brick"
              >
                {orderError}
              </p>
            )}

            {/* 결제 방법은 옆(모바일에서는 아래)의 요약에 적혀 있다. 폰에서는 그게
                버튼을 누른 뒤에야 보이는 자리라, 버튼 바로 위에 한 줄로 먼저 알린다. */}
            <div className="space-y-3">
              <p className="text-xs text-slate leading-relaxed md:hidden">
                결제는 계좌이체로만 받습니다. 주문하면 입금 계좌를 알려 드립니다.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '주문 중…' : '주문하기'}
              </button>
            </div>
          </form>

          {/* Order summary */}
          <div className="md:col-span-5">
            <div className="rounded-lg surface-cream p-6 space-y-6">
              <p className="eyebrow text-slate">Order Summary</p>
              <div className="space-y-4">
                {items.map(item => isAddonLine(item) ? (
                  // 추가 상품 줄: 사진 자리만큼 들여 써서 위 상품에 딸린 줄로 읽히게 한다.
                  <div key={item.key} className="-mt-2 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span aria-hidden className="w-14 shrink-0" />
                      <p className="min-w-0 truncate text-xs text-slate">
                        {ADDON_LABEL}: {item.addon_label}&nbsp;· × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink-body tabular-nums shrink-0">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ) : (
                  <div key={item.key} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 높이만 맞추고 폭은 사진 비율대로 — 자르지 않는다. */}
                      <span className="flex w-14 shrink-0 justify-center">
                        {item.image_url && (
                          <Image
                            src={item.image_url}
                            alt=""
                            width={0}
                            height={0}
                            sizes="56px"
                            className="h-11 w-auto max-w-full rounded-md bg-canvas border border-border-light"
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-body leading-snug truncate">{item.name}</p>
                        <p className="text-xs text-slate mt-0.5">
                          {item.option_label && <>{item.option_label}&nbsp;· </>}× {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-ink-body tabular-nums shrink-0">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-hairline pt-4 flex justify-between items-baseline">
                <span className="eyebrow text-slate">Total</span>
                <span className="text-xl font-semibold text-ink tabular-nums">₩&nbsp;{totalPrice().toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate leading-relaxed">
                * 현재는 계좌이체로 주문을 받고 있습니다.<br />
                주문하면 입금 계좌가 바로 화면에 나옵니다.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
