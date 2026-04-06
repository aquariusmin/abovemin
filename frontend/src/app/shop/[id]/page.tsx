"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tag: string | null;
  image_url: string;
}

export default function ProductDetail() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  const accentColor = "text-[#4A5D4E]";
  const accentBg = "bg-[#4A5D4E]";

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) =>
      supabase.from('products').select('*').eq('id', params.id).single()
        .then(({ data }) => setProduct(data))
    );
  }, [params.id]);

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center font-serif opacity-30 tracking-widest uppercase text-[10px] text-gray-500">
      Loading phorage product...
    </div>
  );

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#333] px-8 py-12 font-serif">

      {/* 뒤로가기 */}
      <div className="max-w-7xl mx-auto mb-12">
        <a href="/shop" className="text-[10px] tracking-widest uppercase text-gray-400 font-sans hover:text-black transition-colors">
          ← Back to Shop
        </a>
      </div>

      {/* 상세 레이아웃 */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-start">

        {/* 이미지 */}
        <div className="md:col-span-7 bg-white border border-gray-100 overflow-hidden shadow-lg shadow-gray-200/50">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-auto object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x800?text=Preparing+Item";
            }}
          />
        </div>

        {/* 정보 */}
        <div className="md:col-span-5 space-y-10">
          <div className="space-y-4">
            {product.tag && (
              <span className={`inline-block px-4 py-1.5 text-[9px] uppercase tracking-widest text-white ${accentBg} rounded-sm`}>
                {product.tag}
              </span>
            )}
            <h2 className="text-5xl font-extrabold tracking-tight leading-tight">{product.name}</h2>
            <p className={`text-2xl font-bold font-sans ${accentColor}`}>₩ {product.price.toLocaleString()}</p>
          </div>

          <div className={`h-1 w-16 ${accentBg}`}></div>

          <div className="font-sans text-sm text-gray-600 leading-relaxed space-y-4">
            <h4 className="font-serif text-lg text-black font-semibold">Story</h4>
            <p>
              필름 사진 속에 담긴 아침 안개의 정취를 기록한 포스터입니다.<br />
              phorage 스튜디오가 추구하는 차분하고 성숙한 분위기를 공간에 더해보세요.
            </p>
            <p className="text-xs text-gray-400">
              * A2 사이즈 (420 x 594mm) / 210g 고급 미색 종이
            </p>
          </div>

          <div className="pt-6 flex space-x-4 items-center">
            <button
              onClick={handleAddToCart}
              className={`flex-1 py-4 text-xs uppercase tracking-widest text-white rounded-sm font-sans font-bold shadow-md transition-all ${added ? 'bg-green-600' : accentBg + ' hover:opacity-90'}`}
            >
              {added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
            <a href="/cart" className="text-[9px] uppercase tracking-widest text-gray-400 hover:text-black font-sans transition-colors whitespace-nowrap">
              View Cart →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
