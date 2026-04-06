"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tag: string | null;
  image_url: string;
}

export default function Shop() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const { addItem } = useCartStore();

  const accentColor = "text-[#4A5D4E]";
  const accentBg = "bg-[#4A5D4E]";

  const handleAddToCart = (e: React.MouseEvent, item: Product) => {
    e.preventDefault();
    addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  useEffect(() => {
    import('@/lib/supabase').then(({ getProducts }) =>
      getProducts().then(data => {
        setItems(data.map(p => ({ ...p, image_url: p.image_url })));
        setLoading(false);
      }).catch(() => setLoading(false))
    );
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-serif opacity-30 tracking-widest uppercase text-[10px] text-gray-500">
      Synchronizing phorage stock...
    </div>
  );

  return (
    <main className="px-8 py-12 font-serif min-h-screen bg-[#FAF9F6]">
      
      {/* 1. Header & Filter Bar (공간 효율 유지) */}
      <header className="max-w-[1600px] mx-auto mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-black/5 pb-6 gap-6">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-2 font-sans">Shop Collection</h2>
            <p className="text-3xl font-light italic text-[#333]">Tangible light for your space.</p>
          </div>
          
          <div className="flex items-center gap-8 text-[11px] uppercase tracking-widest font-sans font-medium text-gray-500">
            <div className="flex gap-5">
              <button className={`${accentColor} font-bold`}>All</button>
              <button className="hover:text-black transition-colors">Posters</button>
              <button className="hover:text-black transition-colors">Postcards</button>
            </div>
            <div className="h-3 w-[1px] bg-black/10"></div>
            <button className="hover:text-black transition-colors italic">Sort / Newest</button>
          </div>
        </div>
      </header>

      {/* 2. 핀터레스트 스타일 숍 그리드 (Masonry) with Framer Motion */}
      <motion.div 
        className="columns-1 md:columns-2 lg:columns-3 gap-12 space-y-12 max-w-[1600px] mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {items.map((item) => (
          <motion.a 
            href={`/shop/${item.id}`} 
            key={item.id} 
            className="break-inside-avoid group cursor-pointer block"
            variants={itemVariants}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            whileHover={{ y: -8, scale: 1.01 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            
            {/* 🌟 껍데기 박스: '애플 글래스' 효과 적용 */}
            {/* bg-white/10(투명도), backdrop-blur-md(흐림), border-white/10(얇은 흰색 테두리) */}
            <div className="relative bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden 
                            # 🌟 마우스 오버 시 더 깊어진 카키색 프리미엄 그림자
                            group-hover:shadow-[0_20px_80px_-15px_rgba(74,93,78,0.3)] transition-all duration-700">
              
              {/* 태그 (Best, New 등) */}
              {item.tag && (
                <span className={`absolute top-4 right-4 px-3 py-1.5 text-[8px] uppercase tracking-widest text-white ${accentBg} z-20 font-sans font-bold shadow-sm rounded-sm`}>
                  {item.tag}
                </span>
              )}
              
              {/* 이미지 영역 */}
              <div className="w-full h-auto relative">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x800?text=Preparing+Item";
                  }}
                />

                {/* 미세한 카키색 오버레이 */}
                <div className="absolute inset-0 bg-[#4A5D4E]/5 group-hover:bg-transparent transition-colors duration-700 z-10"></div>
                
                {/* 🌟 디자인 디테일: 유리 표면 빛 반사 애니메이션 (Shine Effect) */}
                <AnimatePresence>
                  {hoveredId === item.id && (
                    <motion.div 
                      className="absolute inset-0 z-10 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
                      initial={{ x: "-100%", opacity: 0 }}
                      animate={{ x: "100%", opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "linear" }}
                      style={{ mixBlendMode: 'overlay' }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* 하단 디자인 바 (동일) */}
              <div className={`absolute bottom-0 left-0 w-full h-1 ${accentBg} translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20`}></div>
            </div>

            {/* 상품 정보: 이미지 바로 아래에 정갈하게 배치 (동일) */}
            <div className="mt-6 flex justify-between items-start px-1 font-sans">
              <div className="space-y-1">
                <p className="text-[14px] font-bold text-gray-800 group-hover:text-[#4A5D4E] transition-colors">
                  {item.name}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                  {item.category}
                </p>
                <p className={`text-[13px] font-bold mt-2 ${accentColor}`}>
                  ₩ {item.price.toLocaleString()}
                </p>
              </div>
              
              {/* 장바구니 담기 버튼 */}
              <button
                onClick={(e) => handleAddToCart(e, item)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all text-sm font-bold ${addedId === item.id ? 'bg-[#4A5D4E] border-[#4A5D4E] text-white' : 'border-gray-100 text-gray-300 group-hover:border-[#4A5D4E] group-hover:text-[#4A5D4E]'}`}
              >
                {addedId === item.id ? '✓' : '+'}
              </button>
            </div>
          </motion.a>
        ))}
      </motion.div>

      <div className="h-40"></div>
    </main>
  );
}