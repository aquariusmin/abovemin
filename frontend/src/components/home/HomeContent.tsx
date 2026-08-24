"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion, MotionConfig, type Variants } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';

const MotionLink = motion.create(Link);

// Minimal shape of the fields this view actually renders (kept local so this
// client component never pulls the server-side supabase module into its bundle).
interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

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
  /** Delivered width ÷ height of the hero photo. The frame is built from it. */
  heroAspect: number;
  titleHead: string;
  titleTail: string;
  heroSubtitle: string;
  featured: FeaturedProduct[];
}

export default function HomeContent({
  heroImage,
  heroAspect,
  titleHead,
  titleTail,
  heroSubtitle,
  featured,
}: HomeContentProps) {
  // Whether the copy can sit ON the photograph. A panorama leaves a frame too
  // short to carry it: at `md` a 3:1 photo is ~230px tall while the copy needs
  // ~300, and the absolutely-positioned block would spill out of the top of the
  // frame and into the nav. Past this ratio the copy stays in flow beneath the
  // photo at every width — the same treatment phones already get.
  const overlaid = heroAspect <= 2.2;
  /** Applies overlay-only classes, so one ratio decides layout AND palette. */
  const onPhoto = (classes: string) => (overlaid ? classes : '');

  // Widest the frame can ever be drawn: it is capped at `ratio × 76vh`, and
  // 76vh on a tall desktop viewport is ~850px. Without this the hero — the LCP
  // image — would advertise `100vw` and a portrait photo would fetch roughly
  // three times the pixels its narrow column can show.
  const heroWidth = Math.min(1400, Math.round(heroAspect * 850));

  return (
    // reducedMotion="user" makes framer honour the OS "reduce motion" setting,
    // dropping transforms while leaving content fully visible.
    <MotionConfig reducedMotion="user">
      <main className="bg-canvas text-ink-body">

        {/* ── Hero: one photograph, sized by that photograph ─────────────────
             The hero image is admin-configurable and arrives in any
             orientation, so the frame takes ITS shape rather than the other way
             round — `heroAspect` is the delivered width÷height, read on the
             server. Box and picture being the same shape is what removes both
             failure modes at once: nothing is cropped, and there is no leftover
             strip to fill. The height cap narrows the frame instead of cropping
             it, so a portrait photo stays whole and simply occupies a column.

             Copy is laid over the lower band from `md` up, and sits below the
             photo on phones, where a landscape shot is far too short to carry
             it. Type scales in `cqw` so it fits the frame at any orientation. */}
        <section className="px-5 sm:px-6 md:px-10 pt-6 md:pt-10 pb-14 md:pb-20">
          <motion.div
            className="@container relative mx-auto w-full"
            style={{ maxWidth: `min(1400px, calc(${heroAspect} * 76vh))` }}
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={mediaReveal}
              className="relative w-full overflow-hidden rounded-xl bg-stone"
              style={{ aspectRatio: String(heroAspect) }}
            >
              <Image
                src={cloudinary(heroImage, { width: 1600 })}
                fill
                quality={90}
                className="object-cover"
                alt="phorage 대표 이미지 — 초록을 수집하다"
                sizes={`(max-width: ${heroWidth}px) 100vw, ${heroWidth}px`}
                priority
              />
              {/* Only needed where the copy actually sits on the picture. */}
              {overlaid && (
                <div aria-hidden className="scrim-hero absolute inset-0 hidden md:block" />
              )}
            </motion.div>

            <motion.div
              variants={rise}
              className={`mt-7 ${onPhoto('md:mt-0 md:absolute md:inset-x-0 md:bottom-0 md:p-10 lg:p-14')}`}
            >
              <p className={`eyebrow eyebrow-marked text-primary ${onPhoto('md:text-moss')} mb-4 md:mb-6`}>
                phorage studio — Seoul
              </p>
              {/* No hard <br/> between head and tail: the title is
                  admin-configurable, so a forced break turns any longer title
                  (or a Korean one) into a three-line rag. `text-balance` lets
                  the browser even out the lines instead. */}
              <h1 className={`font-serif font-medium tracking-tight leading-[1.05] text-[clamp(1.9rem,7cqw,4.25rem)] text-ink ${onPhoto('md:text-cream')} text-balance max-w-[15ch]`}>
                {titleHead ? <>{titleHead} </> : null}
                {/* Lime underlay behind the last word — the one graphic flourish
                    the hero gets, sized off the cap height. The word itself
                    stays in the running colour: moss-on-moss would swallow the
                    underlay, and over the scrim the bar is the accent, not the
                    letterform. */}
                <span className="relative inline-block">
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-[0.08em] h-[0.28em] rounded-full bg-moss/45 ${onPhoto('md:bg-moss/70')}`}
                  />
                  <span className="relative">{titleTail}</span>
                </span>
              </h1>
              <p className={`mt-5 md:mt-6 text-sm sm:text-base md:text-lg leading-relaxed text-slate ${onPhoto('md:text-cream/85')} break-keep max-w-[46ch]`}>
                {heroSubtitle}
              </p>
              <div className="mt-7 md:mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/archive"
                  className={`btn-primary ${onPhoto('md:bg-moss md:text-forest-black md:hover:bg-cream md:hover:text-forest-deep')}`}
                >
                  사진 아카이브 보기
                </Link>
                <Link
                  href="/shop"
                  className={`link-underline text-ink text-sm ${onPhoto('md:text-cream/85 md:hover:text-moss')}`}
                >
                  소품 보러 가기
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── New collectibles preview ─────────────────────────────────────── */}
        <section className="px-5 sm:px-6 md:px-10 py-16 md:py-28">
          <div className="max-w-[1400px] mx-auto">
            <motion.div
              {...inViewProps}
              variants={rise}
              className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14"
            >
              <div className="space-y-3">
                <p className="eyebrow eyebrow-marked text-muted-foreground">New collectibles</p>
                <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-[-0.01em] text-ink break-keep">
                  이번 달 새로 나온 소품
                </h2>
              </div>
              <Link href="/shop" className="btn-outline">소품 전체 보기</Link>
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
                          src={cloudinary(item.image_url, { width: 600 })}
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
                    <p className="text-sm font-medium text-ink-body group-hover:text-primary transition-colors">{item.name}</p>
                    <p className="text-sm font-mono text-primary">₩&nbsp;{item.price.toLocaleString()}</p>
                  </MotionLink>
                ))}
              </motion.div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16 border border-dashed border-hairline rounded-lg">
                새로운 소품을 준비 중입니다.
              </p>
            )}
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}
