"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', zipcode: '', address: '', note: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const [mounted, setMounted] = useState(false);
  const accentBg = "bg-accent";
  const accentColor = "text-accent";

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
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setSubmitting(true);

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
      alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
      return;
    }

    clearCart();
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-serif text-center px-8">
        <div className={`w-12 h-12 rounded-full ${accentBg} flex items-center justify-center text-white text-xl mb-8`}>✓</div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-4 font-sans">Order Placed</p>
        <h2 className="text-3xl font-light italic text-[#333] mb-4">주문이 완료되었습니다.</h2>
        <p className="text-sm text-gray-400 font-sans mb-10">
          확인 이메일을 <span className={accentColor}>{form.email}</span>으로 보내드릴게요.
        </p>
        <Link href="/shop" className={`px-8 py-3 text-[10px] uppercase tracking-widest text-white ${accentBg} font-sans font-bold`}>
          Continue Shopping
        </Link>
      </main>
    );
  }

  const inputClass = "w-full border border-gray-200 bg-white px-4 py-3 text-sm font-sans text-[#333] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors";
  const errorClass = "text-[10px] text-red-400 font-sans mt-1";

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 md:px-8 py-8 md:py-12 font-serif">
      <div className="max-w-4xl mx-auto">

        <header className="mb-10 border-b border-black/5 pb-6">
          <Link href="/cart" className="text-[10px] uppercase tracking-widest text-gray-400 font-sans hover:text-black transition-colors">
            &larr; Back to Cart
          </Link>
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mt-6 mb-2 font-sans">Checkout</p>
          <p className="text-2xl font-light italic text-[#333]">주문 정보를 입력해주세요.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">

          {/* 주문서 폼 */}
          <form onSubmit={handleSubmit} className="md:col-span-7 space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">이름 *</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }}
                placeholder="홍길동"
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">이메일 *</label>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: undefined })); }}
                placeholder="hello@phorage.com"
              />
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">연락처</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">우편번호</label>
              <input
                className={inputClass}
                value={form.zipcode}
                onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))}
                placeholder="12345"
                inputMode="numeric"
                maxLength={5}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">배송 주소 *</label>
              <input
                className={inputClass}
                value={form.address}
                onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrors(er => ({ ...er, address: undefined })); }}
                placeholder="서울시 마포구 ..."
              />
              {errors.address && <p className={errorClass}>{errors.address}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-sans mb-2">배송 메모</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="문 앞에 놓아주세요"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 text-[10px] uppercase tracking-widest text-white ${accentBg} font-sans font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50`}
            >
              {submitting ? 'Processing...' : 'Place Order'}
            </button>
          </form>

          {/* 주문 요약 */}
          <div className="md:col-span-5 space-y-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-sans">Order Summary</p>
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center font-sans">
                  <div>
                    <p className="text-sm font-semibold text-[#333]">{item.name}</p>
                    <p className="text-[10px] text-gray-400">× {item.quantity}</p>
                  </div>
                  <p className={`text-sm font-bold ${accentColor}`}>₩ {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-black/5 pt-4 flex justify-between items-center font-sans">
              <span className="text-[10px] uppercase tracking-widest text-gray-400">Total</span>
              <span className={`text-xl font-extrabold ${accentColor}`}>₩ {totalPrice().toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
              * 현재는 계좌이체로 주문을 받고 있습니다.<br />
              주문 완료 후 이메일로 입금 안내를 드립니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
