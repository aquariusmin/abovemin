import { getFeaturedProducts, getSiteSettings } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 60;

const DEFAULT_HERO_IMAGE =
  process.env.NEXT_PUBLIC_DEFAULT_HERO_IMAGE ||
  'https://res.cloudinary.com/dmljaqqzc/image/upload/v1776151998/C92CC8C0-9B98-4F63-9331-674818552AD9_4_5005_c_rxmdjn.jpg';

const PILLARS = [
  { title: 'Archive', href: '/archive', desc: '필름과 디지털로 담은 사진을 앨범 단위로 기록합니다.' },
  { title: 'Shop', href: '/shop', desc: '자연에서 영감 받은 포스터와 라이프스타일 소품.' },
  { title: 'Portfolio', href: '/portfolio', desc: '데이터·경제·재무 분석을 의사결정 중심으로 정리합니다.' },
  { title: 'Lab', href: '/lab', desc: '페이퍼 트레이딩 환경에서 전략과 데이터를 관찰합니다.', italic: true },
];

export default async function Home() {
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings().catch((): Record<string, string> => ({})),
  ]);

  const heroImage = settings['hero_image'] || DEFAULT_HERO_IMAGE;
  const heroTitle = settings['hero_title'] || 'Collecting the Greenery';
  const heroSubtitle =
    settings['hero_subtitle'] ||
    '무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록. phorage는 자연과 일상이 교차하는 지점을 기록합니다.';

  const titleHead = heroTitle.split(' ').slice(0, -1).join(' ');
  const titleTail = heroTitle.split(' ').slice(-1).join(' ');

  return (
    <main className="bg-canvas text-ink-body">

      {/* ── Hero: monumental declaration over white canvas ───────────────── */}
      <section className="px-5 sm:px-6 md:px-10 pt-10 md:pt-20 pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto">
          <p className="eyebrow text-accent mb-6 md:mb-8">phorage studio — Seoul</p>
          <h1 className="font-serif font-medium tracking-tight leading-[1.02] text-[clamp(2.75rem,9vw,7.5rem)] text-ink max-w-[14ch]">
            {titleHead ? <>{titleHead}<br /></> : null}
            <span className="text-accent">{titleTail}</span>
          </h1>

          <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 md:items-end">
            <p className="md:col-span-6 lg:col-span-5 text-base md:text-lg leading-relaxed text-slate break-keep">
              {heroSubtitle}
            </p>
            <div className="md:col-span-6 lg:col-span-7 flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
              <Link href="/archive" className="btn-primary">
                Explore the archive
              </Link>
              <Link href="/shop" className="link-underline text-ink text-sm">
                Visit the shop
              </Link>
            </div>
          </div>

          {/* Large rounded hero-media card */}
          <div className="mt-10 md:mt-16 relative aspect-[16/10] md:aspect-[21/9] w-full overflow-hidden rounded-lg bg-stone">
            <Image
              src={heroImage}
              fill
              quality={90}
              className="object-cover"
              alt="phorage 대표 이미지 — 초록을 수집하다"
              sizes="(max-width: 1400px) 100vw, 1400px"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── Pillars / capability strip ───────────────────────────────────── */}
      <section className="px-5 sm:px-6 md:px-10 py-14 md:py-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="eyebrow text-muted mb-8 md:mb-12">What lives here</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-hairline">
            {PILLARS.map(p => (
              <Link
                key={p.title}
                href={p.href}
                className="group border-b border-hairline sm:border-b-0 sm:border-r last:border-r-0 border-hairline p-6 md:p-8 -mt-px flex flex-col gap-3 hover:bg-surface transition-colors"
              >
                <h2 className={`font-serif text-2xl font-medium tracking-tight text-ink group-hover:text-accent transition-colors ${p.italic ? 'italic' : ''}`}>
                  {p.title}
                </h2>
                <p className="text-sm leading-relaxed text-slate break-keep flex-1">{p.desc}</p>
                <span className="eyebrow text-muted group-hover:text-accent transition-colors">Enter →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── New collectibles preview ─────────────────────────────────────── */}
      <section className="px-5 sm:px-6 md:px-10 pb-20 md:pb-32">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14">
            <div className="space-y-3">
              <p className="eyebrow text-muted">New collectibles</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                주인장이 엄선한 이달의 소품
              </h2>
            </div>
            <Link href="/shop" className="btn-outline">Explore all</Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map(item => (
                <Link key={item.id} href={`/shop/${item.id}`} className="group flex flex-col gap-3">
                  <div className="aspect-square overflow-hidden rounded-md bg-stone border border-card-border">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill={false}
                        width={600}
                        height={600}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/5" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-body">{item.name}</p>
                  <p className="text-sm font-mono text-accent">₩ {item.price.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted py-16 border border-dashed border-hairline rounded-md">
              새로운 소품을 준비 중입니다.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
