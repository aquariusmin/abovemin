"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion, MotionConfig, type Variants } from 'framer-motion';

const MotionLink = motion.create(Link);

// Minimal shape of the fields this view actually renders (kept local so this
// client component never pulls the server-side supabase module into its bundle).
interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface Pillar {
  title: string;
  href: string;
  desc: string;
  italic?: boolean;
}

const PILLARS: Pillar[] = [
  { title: 'Archive', href: '/archive', desc: '필름과 디지털로 담은 사진을 앨범 단위로 기록합니다.' },
  { title: 'Shop', href: '/shop', desc: '자연에서 영감 받은 포스터와 라이프스타일 소품.' },
  { title: 'Portfolio', href: '/portfolio', desc: '데이터·경제·재무 분석을 의사결정 중심으로 정리합니다.' },
  { title: 'Lab', href: '/lab', desc: '페이퍼 트레이딩 환경에서 전략과 데이터를 관찰합니다.', italic: true },
];

// Shared editorial easing — slow settle, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const mediaReveal: Variants = {
  hidden: { opacity: 0, y: 24, scale: 1.03 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

// Scroll-in container: children rise in sequence the first time the block
// enters the viewport.
const scrollStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const inViewProps = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.25 },
} as const;

interface HomeContentProps {
  heroImage: string;
  titleHead: string;
  titleTail: string;
  heroSubtitle: string;
  featured: FeaturedProduct[];
}

export default function HomeContent({
  heroImage,
  titleHead,
  titleTail,
  heroSubtitle,
  featured,
}: HomeContentProps) {
  return (
    // reducedMotion="user" makes framer honour the OS "reduce motion" setting,
    // dropping transforms while leaving content fully visible.
    <MotionConfig reducedMotion="user">
      <main className="bg-canvas text-ink-body">

        {/* ── Hero: text and image share the first screen ──────────────────── */}
        <section className="px-5 sm:px-6 md:px-10 pt-8 md:pt-14 pb-14 md:pb-20">
          <motion.div
            className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-x-14"
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            {/* A — eyebrow + monumental title (left/top) */}
            <motion.div variants={rise} className="lg:col-start-1 lg:row-start-1 lg:self-end">
              <p className="eyebrow text-accent mb-5 md:mb-7">phorage studio — Seoul</p>
              <h1 className="font-serif font-medium tracking-tight leading-[1.03] text-[clamp(2.5rem,7vw,5.75rem)] text-ink max-w-[13ch]">
                {titleHead ? <>{titleHead}<br /></> : null}
                <span className="text-accent">{titleTail}</span>
              </h1>
            </motion.div>

            {/* B — hero media, immediately visible beside the headline.
                 Matted stone frame + object-contain shows the WHOLE image at any
                 orientation (the hero image is admin-configurable, so we can't
                 assume a safe crop). Empty space reads as intentional gallery matting. */}
            <motion.div
              variants={mediaReveal}
              className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center"
            >
              <div className="rounded-lg bg-stone p-2.5 sm:p-3">
                <div className="group relative w-full aspect-[4/5] sm:aspect-[3/2] lg:aspect-[4/5] max-h-[74vh] overflow-hidden rounded-md">
                  <Image
                    src={heroImage}
                    fill
                    quality={90}
                    className="object-contain object-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                    alt="phorage 대표 이미지 — 초록을 수집하다"
                    sizes="(max-width: 1024px) 100vw, 680px"
                    priority
                  />
                </div>
              </div>
            </motion.div>

            {/* C — subtitle + CTAs (left/bottom) */}
            <motion.div variants={rise} className="lg:col-start-1 lg:row-start-2 lg:self-start">
              <p className="text-base md:text-lg leading-relaxed text-slate break-keep max-w-[46ch]">
                {heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/archive" className="btn-primary">
                  Explore the archive
                </Link>
                <Link href="/shop" className="link-underline text-ink text-sm">
                  Visit the shop
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Pillars / capability strip ───────────────────────────────────── */}
        <section className="px-5 sm:px-6 md:px-10 py-14 md:py-24">
          <div className="max-w-[1400px] mx-auto">
            <motion.p {...inViewProps} variants={rise} className="eyebrow text-muted mb-8 md:mb-12">
              What lives here
            </motion.p>
            <motion.div
              {...inViewProps}
              variants={scrollStagger}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-hairline"
            >
              {PILLARS.map(p => (
                <MotionLink
                  key={p.title}
                  href={p.href}
                  variants={rise}
                  className="group border-b border-hairline sm:border-b-0 sm:border-r last:border-r-0 border-hairline p-6 md:p-8 -mt-px flex flex-col gap-3 hover:bg-surface transition-colors"
                >
                  <h2 className={`font-serif text-2xl font-medium tracking-tight text-ink group-hover:text-accent transition-colors ${p.italic ? 'italic' : ''}`}>
                    {p.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-slate break-keep flex-1">{p.desc}</p>
                  <span className="eyebrow text-muted group-hover:text-accent transition-colors">
                    Enter{' '}
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </MotionLink>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── New collectibles preview ─────────────────────────────────────── */}
        <section className="px-5 sm:px-6 md:px-10 pb-20 md:pb-32">
          <div className="max-w-[1400px] mx-auto">
            <motion.div
              {...inViewProps}
              variants={rise}
              className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14"
            >
              <div className="space-y-3">
                <p className="eyebrow text-muted">New collectibles</p>
                <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                  주인장이 엄선한 이달의 소품
                </h2>
              </div>
              <Link href="/shop" className="btn-outline">Explore all</Link>
            </motion.div>

            {featured.length > 0 ? (
              <motion.div
                {...inViewProps}
                variants={scrollStagger}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
              >
                {featured.map(item => (
                  <MotionLink
                    key={item.id}
                    href={`/shop/${item.id}`}
                    variants={rise}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="group flex flex-col gap-3"
                  >
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
                  </MotionLink>
                ))}
              </motion.div>
            ) : (
              <p className="text-center text-sm text-muted py-16 border border-dashed border-hairline rounded-md">
                새로운 소품을 준비 중입니다.
              </p>
            )}
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}
