"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion, MotionConfig, type Variants } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';
import { formatPrice } from '@/lib/price';
import { joinCaption, photoCaption, photoLabel } from '@/lib/caption';
import { photoPagePath } from '@/lib/photo-share';
import { monthDayLabel } from '@/lib/timeline';
import FadeImage from '@/components/FadeImage';
import { placeholderStyle, storedRatioStyle } from '@/components/photo-placeholder';

const MotionLink = motion.create(Link);

// Minimal shape of the fields this view actually renders (kept local so this
// client component never pulls the server-side supabase module into its bundle).
interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface RecentPhoto {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
  album_slug: string;
  /** 비율로만 쓴다. 흐린 미리보기 칸을 사진보다 먼저 잡는다. */
  width: number | null;
  height: number | null;
}

interface MemoryPhoto extends RecentPhoto {
  taken_at: string | null;
  /** 서버가 서울 날짜로 센 "몇 년 전". 1 이상. */
  yearsAgo: number;
  /** 월·일이 오늘과 같다. false면 앞뒤 사흘 안에서 넓혀 찾은 사진. */
  exact: boolean;
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
  /** 가장 최근에 올라온 아카이브 사진 (id 내림차순). */
  recent: RecentPhoto[];
  /** 몇 년 전 오늘(서버가 서울 날짜로 고른 것). 비어 있으면 섹션이 없다. */
  onThisDay: MemoryPhoto[];
  photoCount: number;
  albumCount: number;
  /** 판매 중인 상품만. 비어 있으면 소품 섹션과 소품 CTA가 모두 빠진다. */
  featured: FeaturedProduct[];
}

export default function HomeContent({
  heroImage,
  heroAspect,
  titleHead,
  titleTail,
  heroSubtitle,
  recent,
  onThisDay,
  photoCount,
  albumCount,
  featured,
}: HomeContentProps) {
  const hasShop = featured.length > 0;

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
        {/* 아래 여백은 짧게. 다음 장이 cream 띠로 바뀌므로 간격이 아니라
            면의 전환이 구분을 맡는다 — 예전에는 빈 canvas가 데스크톱에서
            ~180px 이어졌다. */}
        <section className="px-5 sm:px-6 md:px-10 pt-6 md:pt-10 pb-12 md:pb-16">
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
                /* Next 16 replaces `priority` with `preload`. Here it is the
                   right migration and not just a rename: one photograph, above
                   the fold at every width, and the LCP element of the site's
                   front door — exactly the case the docs reserve `preload`
                   for. (The masonry grids get `loading`/`fetchPriority`
                   instead; see the note in `ArchiveGrid`.) */
                preload
              />
              {/* Only needed where the copy actually sits on the picture. */}
              {overlaid && (
                <div aria-hidden className="scrim-hero absolute inset-0 hidden md:block" />
              )}
            </motion.div>

            <motion.div
              variants={rise}
              className={`mt-7 ${onPhoto('md:mt-0 md:absolute md:inset-x-0 md:bottom-0 md:p-10 lg:p-14 md:isolate')}`}
            >
              {/* 문구 블록이 자기 scrim을 들고 다닌다.

                  프레임 전체에 깔린 `.scrim-hero`는 사진 높이의 비율로 옅어지는데,
                  문구 블록의 높이는 사진이 아니라 글자 크기가 정한다. 그래서
                  맨 위의 eyebrow가 ramp의 옅은 구간(~30%)에 걸려, 밝은 노을
                  하늘 위에서 moss 11px 글자가 읽히지 않았다. 이 층은 블록의
                  실제 높이에 붙어 있고 위로 한 뼘 더 올라가므로, 사진의 비율이나
                  제목 길이와 상관없이 eyebrow가 항상 어두운 쪽에 앉는다.
                  사진은 자르지 않는다 — 프레임 규칙은 그대로다. */}
              {overlaid && (
                <div aria-hidden className="scrim-hero-copy pointer-events-none absolute inset-x-0 bottom-0 -top-20 lg:-top-24 -z-10 hidden md:block rounded-b-xl" />
              )}
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
                {/* 살 수 있는 것이 없으면 소품으로 가는 길을 앞에 내지 않는다. */}
                {hasShop && (
                  <Link
                    href="/shop"
                    className={`link-underline text-ink text-sm ${onPhoto('md:text-cream/85 md:hover:text-moss')}`}
                  >
                    소품 보러 가기
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 최근 아카이브 ─────────────────────────────────────────────────────
             DESIGN.md § Rhythm: canvas → cream 띠 → canvas → forest 띠 → 푸터.
             홈은 히어로 한 장 뒤에 바로 푸터였고, 이 사이트의 본문인 사진은
             홈 어디에도 없었다. 사진마다 그 사진의 페이지(`/archive/[slug]/[id]`)로
             간다 — 예전에는 `?p=`로 앨범 전체를 내려받은 뒤 라이트박스를 열었다. */}
        {recent.length > 0 && (
          <section className="band-cream texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
            <div className="max-w-[1400px] mx-auto">
              <motion.div
                {...inViewProps}
                variants={rise}
                className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14"
              >
                <div className="space-y-3">
                  <p className="eyebrow eyebrow-marked text-primary">Recently archived</p>
                  <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                    최근 아카이브
                  </h2>
                </div>
                <Link href="/archive" className="btn-outline">아카이브 전체 보기</Link>
              </motion.div>

              {/* 사진의 비율을 그대로 두는 masonry. 정사각으로 자르면 "프레임이
                  사진에 맞춘다"는 원칙이 홈에서 깨진다. */}
              <motion.ul
                {...inViewProps}
                viewport={{ once: true, amount: 0.1 }}
                variants={scrollStagger}
                className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-5 [&>li]:mb-3 md:[&>li]:mb-5"
              >
                {recent.map(photo => {
                  // 최근 사진의 제목은 파일명에서 자동 생성된 것이 많다
                  // ("54D43E53 EFB0 …"). 여기서는 장소와 연도만 적는다 — 제목을
                  // 넘기지 않아야 "제목과 같은 장소" 접기에 장소가 먹히지 않는다.
                  const meta = joinCaption(photoCaption({ location: photo.location, year: photo.year }).meta);
                  return (
                    <motion.li key={photo.id} variants={rise} className="break-inside-avoid">
                      <Link
                        href={photoPagePath(photo)}
                        className="group block"
                      >
                        <div className="overflow-hidden rounded-md bg-cream-deep" style={placeholderStyle(photo.src)}>
                          <FadeImage
                            src={cloudinary(photo.src, { watermark: true, width: 600 })}
                            alt={photoLabel(photo)}
                            width={0}
                            height={0}
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="w-full h-auto block duration-700 group-hover:scale-[1.03]"
                            style={storedRatioStyle(photo)}
                            draggable={false}
                            loading="lazy"
                          />
                        </div>
                        {meta && (
                          <p className="mt-2 eyebrow text-[10px] text-slate group-hover:text-primary transition-colors">
                            {meta}
                          </p>
                        )}
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          </section>
        )}

        {/* ── 몇 년 전 오늘 ─────────────────────────────────────────────────────
             작은 섹션이다: 제목 한 줄과 사진 한 줄. 사진 수(최대 6)보다 칸을
             많이 두지 않아서, 두세 장뿐인 날에도 띠가 비어 보이지 않는다.
             cream 띠 다음이라 canvas 위에 둔다(DESIGN.md § Rhythm).

             라벨은 사진마다 붙인다. 날짜가 딱 맞는 날은 "3년 전 오늘", 앞뒤 사흘로
             넓혀 찾은 날은 "3년 전 · 9월 19일" — 오늘이 아닌 사진을 오늘이라고
             부르지 않는다. */}
        {onThisDay.length > 0 && (
          // 아래에 소품 섹션(같은 canvas)이 이어지면 그쪽의 위 여백이 간격을 맡는다.
          <section
            className={`px-5 sm:px-6 md:px-10 pt-16 md:pt-24 ${hasShop ? 'pb-4 md:pb-8' : 'pb-16 md:pb-24'}`}
            aria-labelledby="on-this-day-title"
          >
            <div className="max-w-[1400px] mx-auto">
              <motion.div {...inViewProps} variants={rise} className="mb-8 md:mb-10 space-y-3">
                <p className="eyebrow eyebrow-marked text-primary">On this day</p>
                <h2 id="on-this-day-title" className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                  몇 년 전 오늘
                </h2>
                {!onThisDay.some(photo => photo.exact) && (
                  <p className="text-[15px] text-slate">딱 오늘 찍은 사진이 없어, 앞뒤 사흘 사이에서 골랐습니다.</p>
                )}
              </motion.div>

              <motion.ul
                {...inViewProps}
                viewport={{ once: true, amount: 0.1 }}
                variants={scrollStagger}
                className={`columns-2 gap-3 md:gap-5 [&>li]:mb-3 md:[&>li]:mb-5 ${
                  onThisDay.length >= 5 ? 'md:columns-3 lg:columns-6' : onThisDay.length >= 3 ? 'md:columns-3 lg:columns-4' : 'md:columns-3'
                }`}
              >
                {onThisDay.map(photo => {
                  const when = photo.exact
                    ? `${photo.yearsAgo}년 전 오늘`
                    : joinCaption([`${photo.yearsAgo}년 전`, monthDayLabel(photo.taken_at)].filter((v): v is string => Boolean(v)));
                  const place = photoCaption({ location: photo.location }).location;
                  return (
                    <motion.li key={photo.id} variants={rise} className="break-inside-avoid">
                      <Link href={photoPagePath(photo)} className="group block">
                        <div className="overflow-hidden rounded-md bg-stone" style={placeholderStyle(photo.src)}>
                          <FadeImage
                            src={cloudinary(photo.src, { watermark: true, width: 600 })}
                            alt={photoLabel(photo)}
                            width={0}
                            height={0}
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 17vw"
                            className="w-full h-auto block duration-700 group-hover:scale-[1.03]"
                            style={storedRatioStyle(photo)}
                            draggable={false}
                            loading="lazy"
                          />
                        </div>
                        <p className="mt-2 text-[13px] font-medium text-ink-body group-hover:text-primary transition-colors">
                          {when}
                        </p>
                        {place && <p className="eyebrow text-[10px] text-slate">{place}</p>}
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          </section>
        )}

        {/* ── New collectibles preview ─────────────────────────────────────────
             살 수 있는 소품이 하나라도 있을 때만. 카탈로그가 전부 자리표시자인
             동안 이 섹션은 "이번 달 새로 나온 소품" 아래 ₩ 0짜리 카드 세 장을
             걸고 있었다 — 홈에서 가장 큰 거짓말이었다. `featured`는 서버에서
             이미 판매 중인 것만 거른 목록이다. */}
        {featured.length > 0 && (
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
                    <p className="text-sm font-mono text-primary">{formatPrice(item.price)}</p>
                  </MotionLink>
                ))}
              </motion.div>
          </div>
        </section>
        )}

        {/* ── 닫는 띠 ──────────────────────────────────────────────────────────
             페이지마다 forest 띠는 하나. 가장 앞에 내세울 행동은 아카이브이고,
             소품은 살 수 있는 것이 있을 때만 두 번째로 붙는다. */}
        <section className="band-dark texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
          <motion.div
            {...inViewProps}
            variants={rise}
            className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12"
          >
            <div className="space-y-4 max-w-2xl">
              <p className="eyebrow eyebrow-marked text-moss">The Archive</p>
              <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight leading-[1.1] text-cream">
                {photoCount > 0
                  ? `${albumCount}개의 컬렉션, ${photoCount.toLocaleString()}장의 빛`
                  : '어제의 빛을 모아 둡니다'}
              </h2>
              <p className="text-[15px] md:text-base leading-relaxed text-cream/75 max-w-[46ch]">
                여행지와 동네에서 모은 사진을 컬렉션별로, 또는 연도와 장소로 찾아볼 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
              <Link
                href="/archive"
                className="btn-primary bg-moss text-forest-black hover:bg-cream hover:text-forest-deep"
              >
                아카이브 둘러보기
              </Link>
              {hasShop && (
                <Link href="/shop" className="link-underline text-sm text-cream/85 hover:text-moss">
                  소품 보러 가기
                </Link>
              )}
            </div>
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  );
}
