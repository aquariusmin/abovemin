"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { items, totalPrice, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', zipcode: '', address: '', note: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [orderError, setOrderError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !done) {
      router.replace('/cart');
    }
  }, [mounted, items.length, done, router]);

  if (!mounted || (items.length === 0 && !done)) return null;

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = '이름을 입력해주세요';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '올바른 이메일을 입력해주세요';
    if (!form.address.trim()) e.address = '주소를 입력해주세요';
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

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          zipcode: form.zipcode.trim() || null,
          address: form.address.trim(),
          note: form.note.trim() || null,
          items,
          total_price: totalPrice(),
        }),
      });

      if (!res.ok) {
        setOrderError('주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setSubmitting(false);
        return;
      }

      clearCart();
      setDone(true);
    } catch {
      setOrderError('네트워크 오류로 주문을 보내지 못했습니다. 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main
        className="min-h-screen bg-canvas flex flex-col items-center justify-center text-center px-8"
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
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink mb-4">주문이 완료되었습니다.</h1>
        <p className="text-[15px] text-ink-body mb-10 break-keep">
          확인 이메일을 <span className="text-accent font-medium">{form.email}</span>으로 보내드릴게요.
        </p>
        <Link href="/shop" className="btn-primary">Continue Shopping</Link>
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
          <Link href="/cart" className="link-underline text-sm text-slate">
            ← Back to Cart
          </Link>
          <p className="eyebrow text-muted-foreground mt-6 mb-3">Checkout</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink">주문 정보를 입력해주세요.</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">

          {/* Order form */}
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
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>이메일 *</label>
              <input
                id="email"
                className={inputClass}
                type="email"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: undefined })); }}
                placeholder="hello@phorage.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <p id="email-error" className={errorClass}>{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>연락처</label>
              <input
                id="phone"
                className={inputClass}
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="010-0000-0000"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div>
              <label htmlFor="zipcode" className={labelClass}>우편번호</label>
              <input
                id="zipcode"
                className={inputClass}
                value={form.zipcode}
                onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))}
                placeholder="12345"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={5}
              />
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>배송 주소 *</label>
              <input
                id="address"
                className={inputClass}
                value={form.address}
                onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrors(er => ({ ...er, address: undefined })); }}
                placeholder="서울시 마포구 ..."
                autoComplete="street-address"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
              />
              {errors.address && <p id="address-error" className={errorClass}>{errors.address}</p>}
            </div>

            <div>
              <label htmlFor="note" className={labelClass}>배송 메모</label>
              <textarea
                id="note"
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="문 앞에 놓아주세요"
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

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing…' : 'Place Order'}
            </button>
          </form>

          {/* Order summary */}
          <div className="md:col-span-5">
            <div className="rounded-lg bg-stone p-6 space-y-6">
              <p className="eyebrow text-muted-foreground">Order Summary</p>
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="relative w-11 h-11 shrink-0 rounded-md overflow-hidden bg-canvas border border-border-light">
                        <Image src={item.image_url} alt="" fill className="object-cover" sizes="44px" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-body leading-snug truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">× {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-ink-body tabular-nums shrink-0">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-hairline pt-4 flex justify-between items-baseline">
                <span className="eyebrow text-muted-foreground">Total</span>
                <span className="text-xl font-semibold text-ink tabular-nums">₩&nbsp;{totalPrice().toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate leading-relaxed">
                * 현재는 계좌이체로 주문을 받고 있습니다.<br />
                주문 완료 후 이메일로 입금 안내를 드립니다.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
