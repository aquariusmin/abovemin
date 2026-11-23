import Image from 'next/image';
import Link from 'next/link';
import { cloudinary, mayHaveAlpha } from '@/lib/cloudinary';
import { formatPrice } from '@/lib/price';
import { joinCaption, photoCaption, photoLabel } from '@/lib/caption';
import { photoPagePath } from '@/lib/photo-share';
import { monthDayLabel } from '@/lib/timeline';
import FadeImage from '@/components/FadeImage';
import { placeholderStyle, storedRatioStyle } from '@/components/photo-placeholder';
import Reveal from '@/components/motion/Reveal';
import { balanceColumns, photoRatio } from '@/lib/layout-photos';
import { displayFace } from '@/lib/typography';
import Snowfall from './Snowfall';

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
  width: number | null;
  height: number | null;
}

interface MemoryPhoto extends RecentPhoto {
  taken_at: string | null;
  yearsAgo: number;
  /** 월·일이 오늘과 같다. false면 앞뒤 사흘 안에서 넓혀 찾은 사진. */
  exact: boolean;
}

/** 서버 HTML에서는 모두 보이고, 마운트 때 뷰포트 아래에 있던 것만 들어올 때 올라온다(하이드레이션 대기 없음). */
const RISE = { duration: 0.7, y: 24 } as const;
const RISE_BLOCK = { ...RISE, amount: 0.25 } as const;
const RISE_ITEM = { ...RISE, amount: 0.15 } as const;

interface HomeContentProps {
  /** 겨울 장식 기간이면 눈·전구 줄·상자 위 눈을 그린다(`lib/season.ts`). */
  winter?: boolean;
  heroImage: string;
  /** Delivered width ÷ height of the hero photo. The frame is built from it. */
  heroAspect: number;
  titleHead: string;
  titleTail: string;
  heroSubtitle: string;
  recent: RecentPhoto[];
  onThisDay: MemoryPhoto[];
  photoCount: number;
  albumCount: number;
  featured: FeaturedProduct[];
}

export default function HomeContent({
  winter = false,
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
  const recentColumns = balanceColumns(recent, 4, photoRatio, 0.12);

  // 서너 장 이하면 한 줄로 편다: `flex-grow`가 비율이라 높이가 같고 자르지 않는다. 줄 높이 상한.
  const MEMORY_ROW = 440;
  const memoryRow = onThisDay.length > 0 && onThisDay.length <= 3;
  const memoryRatios = onThisDay.map(photoRatio);
  const memoryRatioSum = memoryRatios.reduce((sum, r) => sum + r, 0);

  // Copy leaves the photo for panoramas (frame too short) and portraits (it sits beside them from `lg`).
  const split = heroAspect < 1;
  const overlaid = !split && heroAspect <= 2.2;
  const onPhoto = (classes: string) => (overlaid ? classes : '');

  // Widest the frame can draw (ratio × 76vh ≈ 850px), so the LCP hero doesn't advertise `100vw`.
  const heroWidth = Math.min(1400, Math.round(heroAspect * 850));

  return (
    <main className="relative bg-canvas text-ink-body" data-winter={winter || undefined}>
      {winter && <Snowfall />}

      {/* Hero frame takes the photo's shape (`heroAspect`); the height cap narrows it instead of cropping. */}
      <section className="px-5 sm:px-6 md:px-10 pt-6 md:pt-10 pb-12 md:pb-16">
        {/* 히어로는 처음부터 보인다(LCP). 문구만 CSS `.hero-rise`로 올라오고 불투명도는 건드리지 않는다. */}
        <div
          className={`@container relative mx-auto w-full ${split ? 'max-w-[1400px] lg:flex lg:items-end lg:justify-center lg:gap-14 xl:gap-20' : ''}`}
          style={
            split
              ? ({ '--hero-w': `min(100%, calc(${heroAspect} * 76vh))` } as React.CSSProperties)
              : { maxWidth: `min(1400px, calc(${heroAspect} * 76vh))` }
          }
        >
          <div
            className={`relative overflow-hidden rounded-xl bg-stone ${split ? 'mx-auto w-[var(--hero-w)] lg:mx-0 lg:shrink-0' : 'w-full'}`}
            style={{ aspectRatio: String(heroAspect) }}
          >
            <Image
              src={cloudinary(heroImage, { width: 1600 })}
              fill
              quality={90}
              className="object-cover"
              alt="phorage 대표 사진"
              sizes={`(max-width: ${heroWidth}px) 100vw, ${heroWidth}px`}
              /* `preload`: one above-the-fold photo and the site's LCP, the case the docs reserve it for. */
              preload
              /* `preload`만으로는 우선순위가 오르지 않는다 — fetchPriority가 link와 img 모두에 실린다. */
              fetchPriority="high"
            />
            {overlaid && (
              <div aria-hidden className="scrim-hero absolute inset-0 hidden md:block" />
            )}
          </div>

          <div
            className={`hero-rise mt-7 ${onPhoto('md:mt-0 md:absolute md:inset-x-0 md:bottom-0 md:p-10 lg:p-14 md:isolate')} ${
              split ? 'max-lg:mx-auto max-lg:max-w-[var(--hero-w)] lg:mt-0 lg:max-w-[32rem] lg:pb-2' : ''
            }`}
          >
            {overlaid && (
              <div aria-hidden className="scrim-hero-copy pointer-events-none absolute inset-x-0 bottom-0 -top-20 lg:-top-24 -z-10 hidden md:block rounded-b-xl" />
            )}
            <p className={`eyebrow eyebrow-marked text-primary ${onPhoto('md:text-moss')} mb-4 md:mb-6`}>
              phorage
            </p>
            {/* No hard <br/>: the title is admin-configurable; `text-balance` evens out the lines. */}
            <h1 className={`${displayFace(`${titleHead} ${titleTail}`)} font-medium tracking-tight leading-[1.05] text-[clamp(1.9rem,7cqw,4.25rem)] text-ink ${onPhoto('md:text-cream')} text-balance max-w-[15ch]`}>
              {titleHead ? <>{titleHead} </> : null}
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
                사진 보기
              </Link>
              {hasShop && (
                <Link
                  href="/shop"
                  className={`link-underline text-ink text-sm ${onPhoto('md:text-cream/85 md:hover:text-moss')}`}
                >
                  소품 보기
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="band-cream texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="max-w-[1400px] mx-auto">
            <Reveal {...RISE_BLOCK} className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14">
              <div className="space-y-3">
                <p className="eyebrow eyebrow-marked text-primary">Recently archived</p>
                <h2 className="font-display-ko text-3xl md:text-4xl font-medium text-ink">
                  최근 올라온 사진
                </h2>
              </div>
              <Link href="/archive" className="btn-outline">사진 전체 보기</Link>
            </Reveal>

            {/* 자르지 않는 masonry. CSS columns 대신 높이를 맞춰 미리 나눈 네 열(`balanceColumns`). */}
            <div className="grid grid-cols-2 items-start gap-3 md:gap-5">
              {[0, 2].map(half => (
                <div key={half} className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3 md:gap-5">
                  {recentColumns.slice(half, half + 2).map((column, c) => (
                    <ul key={c} className="flex flex-col gap-3 md:gap-5">
                      {column.map(photo => {
                        // 제목은 파일명에서 자동 생성된 것이 많아 장소와 연도만 쓴다.
                        const meta = joinCaption(photoCaption({ location: photo.location, year: photo.year }).meta);
                        return (
                          <Reveal as="li" {...RISE_ITEM} key={photo.id}>
                            <Link
                              href={photoPagePath(photo)}
                              className="group block snow-cap"
                            >
                              <div className="overflow-hidden rounded-md bg-cream-deep" style={placeholderStyle(photo.src)}>
                                <FadeImage
                                  src={cloudinary(photo.src, { watermark: true, width: 600 })}
                                  alt={photoLabel(photo)}
                                  width={0}
                                  height={0}
                                  sizes="(min-width: 1480px) 335px, (min-width: 1024px) 23vw, 47vw"
                                  className="w-full h-auto block duration-700 group-hover:scale-[1.03]"
                                  style={storedRatioStyle(photo)}
                                  draggable={false}
                                  loading="lazy"
                                />
                              </div>
                              {meta && (
                                <p className="mt-2 label-ko text-slate group-hover:text-primary transition-colors">
                                  {meta}
                                </p>
                              )}
                            </Link>
                          </Reveal>
                        );
                      })}
                    </ul>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {onThisDay.length > 0 && (
        <section
          className={`px-5 sm:px-6 md:px-10 pt-16 md:pt-24 ${hasShop ? 'pb-4 md:pb-8' : 'pb-16 md:pb-24'}`}
          aria-labelledby="on-this-day-title"
        >
          <div
            className={`max-w-[1400px] mx-auto ${
              memoryRow ? 'lg:grid lg:grid-cols-[minmax(14rem,1fr)_auto] lg:items-end lg:gap-16' : ''
            }`}
          >
            <Reveal {...RISE_BLOCK} className={`mb-8 md:mb-10 space-y-3 ${memoryRow ? 'lg:mb-10' : ''}`}>
              <p className="eyebrow eyebrow-marked text-primary">On this day</p>
              <h2 id="on-this-day-title" className="font-display-ko text-3xl md:text-4xl font-medium text-ink">
                몇 년 전 오늘
              </h2>
              {!onThisDay.some(photo => photo.exact) && (
                <p className="text-[15px] text-slate">딱 오늘 찍은 사진은 없어서, 이맘때 찍은 사진을 골랐습니다.</p>
              )}
            </Reveal>

            <ul
              className={`columns-2 gap-3 md:gap-5 [&>li]:mb-3 md:[&>li]:mb-5 ${
                memoryRow
                  ? 'md:columns-auto md:flex md:items-start md:[&>li]:mb-0'
                  : onThisDay.length >= 5 ? 'md:columns-3 lg:columns-6' : 'md:columns-3 lg:columns-4'
              }`}
              style={memoryRow ? { maxWidth: `calc(${memoryRatioSum.toFixed(3)} * ${MEMORY_ROW}px + ${(onThisDay.length - 1) * 20}px)` } : undefined}
            >
              {onThisDay.map((photo, index) => {
                const when = photo.exact
                  ? `${photo.yearsAgo}년 전 오늘`
                  : joinCaption([`${photo.yearsAgo}년 전`, monthDayLabel(photo.taken_at)].filter((v): v is string => Boolean(v)));
                const place = photoCaption({ location: photo.location }).location;
                return (
                  <li
                    key={photo.id}
                    className="break-inside-avoid min-w-0"
                    style={memoryRow ? { flex: `${memoryRatios[index].toFixed(3)} 1 0%` } : undefined}
                  >
                  <Reveal {...RISE_ITEM}>
                    <Link href={photoPagePath(photo)} className="group block snow-cap">
                      <div className="overflow-hidden rounded-md bg-stone" style={placeholderStyle(photo.src)}>
                        <FadeImage
                          src={cloudinary(photo.src, { watermark: true, width: 600 })}
                          alt={photoLabel(photo)}
                          width={0}
                          height={0}
                          sizes={
                            memoryRow
                              ? `(min-width: 768px) ${Math.round(memoryRatios[index] * MEMORY_ROW)}px, 47vw`
                              : onThisDay.length >= 5
                              ? '(min-width: 1480px) 217px, (min-width: 1024px) 15vw, (min-width: 768px) 30vw, 47vw'
                              : '(min-width: 1480px) 335px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 47vw'
                          }
                          className="w-full h-auto block duration-700 group-hover:scale-[1.03]"
                          style={storedRatioStyle(photo)}
                          draggable={false}
                          loading="lazy"
                        />
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink-body group-hover:text-primary transition-colors">
                        {when}
                      </p>
                      {place && <p className="label-ko text-slate">{place}</p>}
                    </Link>
                  </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {featured.length > 0 && (
      <section className="px-5 sm:px-6 md:px-10 py-16 md:py-28">
        <div className="max-w-[1400px] mx-auto">
          <Reveal {...RISE_BLOCK} className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14">
            <div className="space-y-3">
              <p className="eyebrow eyebrow-marked text-muted-foreground">New collectibles</p>
              <h2 className="font-display-ko text-3xl md:text-4xl font-medium text-ink break-keep">
                새로 나온 소품
              </h2>
            </div>
            <Link href="/shop" className="btn-outline">소품 전체 보기</Link>
          </Reveal>

          {featured.length === 1 ? (
            <Reveal
              as="a"
              href={`/shop/${featured[0].id}`}
              className="group grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 lg:gap-20"
              {...RISE_ITEM}
            >
              <div className="flex justify-center md:justify-end">
                {featured[0].image_url ? (
                  <Image
                    src={cloudinary(featured[0].image_url, { width: 1200 })}
                    alt={featured[0].name}
                    width={0}
                    height={0}
                    sizes="(min-width: 1480px) 650px, (min-width: 768px) 45vw, calc(100vw - 40px)"
                    className={`h-auto w-auto max-w-full max-h-[min(36rem,70svh)] transition-transform duration-700 group-hover:scale-[1.01] ${
                      mayHaveAlpha(featured[0].image_url) ? '' : 'rounded-lg border border-card-border bg-stone'
                    }`}
                  />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-accent/5" />
                )}
              </div>
              <div className="max-w-md">
                <p className="label-ko text-muted-foreground">새 소품</p>
                <p className={`mt-4 ${displayFace(featured[0].name)} text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink group-hover:text-primary transition-colors`}>
                  {featured[0].name}
                </p>
                <p className="mt-4 text-lg font-medium tabular-nums text-ink-body">{formatPrice(featured[0].price)}</p>
                <span className="mt-8 inline-block link-underline text-sm text-ink">자세히 보기 →</span>
              </div>
            </Reveal>
          ) : (
          <div
            className={`grid grid-cols-2 gap-4 md:gap-6 ${
              featured.length === 2 ? 'max-w-[920px]' : featured.length === 3 ? 'lg:grid-cols-3 max-w-[1120px]' : 'lg:grid-cols-4'
            }`}
          >
              {featured.map(item => (
                <Reveal
                  as="a"
                  key={item.id}
                  href={`/shop/${item.id}`}
                  className="group lift-card flex flex-col gap-3"
                  {...RISE_ITEM}
                >
                  {/* 사진을 자르지 않는다: 정사각 `object-cover` 없이 비율 그대로. 컷아웃은 프레임 없이. */}
                  <div
                    className={`overflow-hidden ${
                      item.image_url && mayHaveAlpha(item.image_url) ? '' : 'rounded-md bg-stone border border-card-border'
                    }`}
                  >
                    {item.image_url ? (
                      <Image
                        src={cloudinary(item.image_url, { width: 600 })}
                        alt={item.name}
                        width={0}
                        height={0}
                        className="block w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="(min-width: 1480px) 332px, (min-width: 1024px) 23vw, (min-width: 768px) 45vw, 47vw"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-accent/5" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-body group-hover:text-primary transition-colors">{item.name}</p>
                  <p className="text-sm font-mono text-primary">{formatPrice(item.price)}</p>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <section className="band-dark texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
        <Reveal {...RISE_BLOCK} className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12">
          <div className="space-y-4 max-w-2xl">
            <p className="eyebrow eyebrow-marked text-moss">The Archive</p>
            <h2 className="font-display-ko text-3xl md:text-4xl font-medium leading-[1.15] text-cream">
              {photoCount > 0
                ? `${albumCount}개의 앨범, ${photoCount.toLocaleString()}장의 사진`
                : '아직 올린 사진이 없습니다.'}
            </h2>
            <p className="text-[15px] md:text-base leading-relaxed text-cream/75 max-w-[46ch]">
              앨범별로 보거나, 연도와 장소로 찾아보세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
            <Link
              href="/archive"
              className="btn-primary snow-cap snow-cap-pill bg-moss text-forest-black hover:bg-cream hover:text-forest-deep"
            >
              사진 보기
            </Link>
            {hasShop && (
              <Link href="/shop" className="link-underline text-sm text-cream/85 hover:text-moss">
                소품 보기
              </Link>
            )}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
