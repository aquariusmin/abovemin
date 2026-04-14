import { getProducts } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 60;

export default async function Home() {
  const allProducts = await getProducts().catch(() => []);
  const featured = allProducts.slice(-4).reverse();

  const accentColor = "text-accent";
  const accentBg = "bg-accent";

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#333] px-8 py-12 font-serif">

      {/* 히어로 섹션 */}
      <div className="max-w-6xl mx-auto mb-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-8 aspect-[16/10] bg-gray-200 relative overflow-hidden rounded-sm shadow-xl shadow-gray-200/40">
          <Image
            src="https://images.unsplash.com/photo-1493246507139-91e8bef99c02"
            fill
            className="object-cover grayscale-[10%]"
            alt="Hero"
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
          />
          <div className="absolute inset-0 bg-accent/10 mix-blend-multiply"></div>
        </div>

        <div className="md:col-span-4 space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Collecting<br />
            the <span className={accentColor}>Greenery</span>
          </h2>
          <p className="font-sans text-sm text-gray-500 leading-relaxed">
            무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록. <br />
            phorage는 자연과 일상이 교차하는 지점을 기록합니다.
          </p>
        </div>
      </div>

      {/* 소품샵 미리보기 */}
      <section className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-2xl font-bold">New Collectibles</h3>
            <p className="text-xs text-gray-400 mt-2 font-sans">주인장이 엄선한 이달의 소품</p>
          </div>
          <Link href="/shop" className={`px-6 py-2 font-sans text-[10px] uppercase tracking-widest text-white ${accentBg} rounded-sm shadow-md`}>
            Explore All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {featured.length > 0 ? featured.map((item) => (
            <Link key={item.id} href={`/shop/${item.id}`} className="space-y-4 group cursor-pointer">
              <div className="aspect-square bg-white rounded-sm overflow-hidden border border-gray-100 group-hover:border-accent/50 transition-all relative">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                ) : (
                  <div className={`w-full h-full opacity-5 ${accentBg}`} />
                )}
              </div>
              <p className="font-sans text-sm font-medium">{item.name}</p>
              <p className={`font-sans text-xs ${accentColor}`}>₩ {item.price.toLocaleString()}</p>
            </Link>
          )) : (
            // 로딩 실패 시 플레이스홀더
            [{id:1,name:"Olive Leaf Poster",price:18000},{id:2,name:"Sage Pencil Set",price:8000},{id:3,name:"Forest Postcard Pack",price:12000},{id:4,name:"Khaki Canvas Bag",price:24000}].map((item) => (
              <div key={item.id} className="space-y-4 group cursor-pointer">
                <div className={`aspect-square bg-white rounded-sm overflow-hidden border border-gray-100`}>
                  <div className={`w-full h-full opacity-5 ${accentBg}`}></div>
                </div>
                <p className="font-sans text-sm font-medium">{item.name}</p>
                <p className={`font-sans text-xs ${accentColor}`}>₩ {item.price.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
