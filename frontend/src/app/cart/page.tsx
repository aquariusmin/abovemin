"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const accentColor = "text-accent";
  const accentBg = "bg-accent";

  if (items.length === 0) return (
    <main className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center font-serif text-center px-8">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-4 font-sans">Cart</p>
      <p className="text-2xl font-light italic text-[#333] mb-8">Your cart is empty.</p>
      <Link href="/shop" className={`px-8 py-3 text-[10px] uppercase tracking-widest text-white ${accentBg} font-sans font-bold`}>
        Back to Shop
      </Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 md:px-8 py-8 md:py-12 font-serif">
      <div className="max-w-4xl mx-auto">

        {/* 헤더 */}
        <header className="mb-10 md:mb-16 border-b border-black/5 pb-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-2 font-sans">Your Cart</p>
          <p className="text-2xl md:text-3xl font-light italic text-[#333]">Ready to collect?</p>
        </header>

        {/* 아이템 목록 */}
        <div className="space-y-6 md:space-y-8 mb-12 md:mb-16">
          {items.map(item => (
            <div key={item.id} className="border-b border-black/5 pb-6 md:pb-8">

              {/* 모바일: 상단 이미지+정보 / 하단 수량+가격 */}
              <div className="flex gap-4 md:gap-8 items-start md:items-center">

                {/* 이미지 */}
                <Link href={`/shop/${item.id}`} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white border border-gray-100 overflow-hidden flex-shrink-0 relative">
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="96px" />
                </Link>

                {/* 정보 + 모바일용 소계 */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-bold text-gray-800 leading-snug">{item.name}</p>
                  <p className={`font-sans text-xs ${accentColor} font-bold mt-1`}>₩ {item.price.toLocaleString()}</p>

                  {/* 모바일: 수량 + 소계 + 삭제 한 줄에 */}
                  <div className="flex items-center justify-between mt-3 md:hidden">
                    <div className="flex items-center gap-2 font-sans">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-9 h-9 border border-gray-200 text-gray-400 hover:border-accent hover:text-accent transition-all text-base leading-none"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-9 h-9 border border-gray-200 text-gray-400 hover:border-accent hover:text-accent transition-all text-base leading-none"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-sans text-sm font-bold text-gray-800">
                        ₩ {(item.price * item.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[9px] uppercase tracking-widest text-gray-300 hover:text-red-400 font-sans transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* 데스크탑: 수량 조절 */}
                <div className="hidden md:flex items-center gap-3 font-sans">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 border border-gray-200 text-gray-400 hover:border-accent hover:text-accent transition-all text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 border border-gray-200 text-gray-400 hover:border-accent hover:text-accent transition-all text-lg leading-none"
                  >
                    +
                  </button>
                </div>

                {/* 데스크탑: 소계 + 삭제 */}
                <div className="hidden md:block text-right space-y-2 min-w-[80px]">
                  <p className="font-sans text-sm font-bold text-gray-800">
                    ₩ {(item.price * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[9px] uppercase tracking-widest text-gray-300 hover:text-red-400 font-sans transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 합계 & 버튼 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8">
          <button
            onClick={clearCart}
            className="text-[9px] uppercase tracking-widest text-gray-300 hover:text-gray-500 font-sans transition-colors"
          >
            Clear All
          </button>

          <div className="w-full md:w-auto text-right space-y-4">
            <div className="font-sans">
              <span className="text-[10px] uppercase tracking-widest text-gray-400">Total </span>
              <span className={`text-2xl font-extrabold ${accentColor}`}>
                ₩ {totalPrice().toLocaleString()}
              </span>
            </div>
            <Link href="/cart/checkout" className={`block w-full md:w-auto px-12 py-4 text-[10px] uppercase tracking-widest text-white ${accentBg} font-sans font-bold shadow-md hover:opacity-90 transition-all text-center`}>
              Checkout
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
