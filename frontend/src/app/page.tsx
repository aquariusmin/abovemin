import { getFeaturedProducts, getSiteSettings } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 60;

const DEFAULT_HERO_IMAGE =
  process.env.NEXT_PUBLIC_DEFAULT_HERO_IMAGE ||
  'https://res.cloudinary.com/dmljaqqzc/image/upload/v1776151998/C92CC8C0-9B98-4F63-9331-674818552AD9_4_5005_c_rxmdjn.jpg';

export default async function Home() {
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings().catch((): Record<string, string> => ({})),
  ]);

  const heroImage = settings['hero_image'] || DEFAULT_HERO_IMAGE;
  const heroTitle = settings['hero_title'] || 'Collecting the Greenery';
  const heroSubtitle = settings['hero_subtitle'] || '무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록. phorage는 자연과 일상이 교차하는 지점을 기록합니다.';

  const accentColor = "text-accent";
  const accentBg = "bg-accent";

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#333] font-serif">

      {/* 히어로 섹션 — 풀스크린 */}
      <section className="min-h-[calc(100dvh-72px)] md:min-h-[calc(100dvh-88px)] flex items-center px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-center">
          <div className="md:col-span-8 aspect-[16/10] bg-gray-200 relative overflow-hidden rounded-sm shadow-xl shadow-gray-200/40">
            <Image
              src={heroImage}
              fill
              quality={90}
              className="object-cover grayscale-[10%]"
              alt="Hero"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
            <div className="absolute inset-0 bg-accent/10 mix-blend-multiply"></div>
          </div>

          <div className="md:col-span-4 space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
              {heroTitle.split(' ').slice(0, -1).join(' ')}<br />
              <span className={accentColor}>{heroTitle.split(' ').slice(-1)}</span>
            </h2>
            <p className="font-sans text-sm text-gray-500 leading-relaxed">
              {heroSubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* 소품샵 미리보기 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-20">
        <div className="flex justify-between items-end mb-8 md:mb-12">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">New Collectibles</h3>
            <p className="text-xs text-gray-400 mt-2 font-sans">주인장이 엄선한 이달의 소품</p>
          </div>
          <Link href="/shop" className={`px-4 sm:px-6 py-2 font-sans text-[10px] uppercase tracking-widest text-white ${accentBg} rounded-sm shadow-md`}>
            Explore All
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {featured.map((item) => (
              <Link key={item.id} href={`/shop/${item.id}`} className="space-y-3 md:space-y-4 group cursor-pointer">
                <div className="aspect-square bg-white rounded-sm overflow-hidden border border-gray-100 group-hover:border-accent/50 transition-all relative">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className={`w-full h-full opacity-5 ${accentBg}`} />
                  )}
                </div>
                <p className="font-sans text-xs sm:text-sm font-medium">{item.name}</p>
                <p className={`font-sans text-xs ${accentColor}`}>₩ {item.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-gray-400 font-sans py-12">
            새로운 소품을 준비 중입니다.
          </p>
        )}
      </section>
    </main>
  );
}
