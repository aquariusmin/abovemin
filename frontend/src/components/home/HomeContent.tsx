import Image from 'next/image';
import Link from 'next/link';
import { cloudinary } from '@/lib/cloudinary';
import { formatPrice } from '@/lib/price';
import { joinCaption, photoCaption, photoLabel } from '@/lib/caption';
import { photoPagePath } from '@/lib/photo-share';
import { monthDayLabel } from '@/lib/timeline';
import FadeImage from '@/components/FadeImage';
import { placeholderStyle, storedRatioStyle } from '@/components/photo-placeholder';
import Reveal from '@/components/motion/Reveal';
import { balanceColumns, photoRatio } from '@/lib/layout-photos';

// Minimal shape of the fields this view actually renders.
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

/**
 * 스크롤 등장. 서버 HTML에서는 모두 보이고, 마운트 때 뷰포트 아래에 있던 것만
 * 숨었다가 들어올 때 올라온다 — 첫 화면에 걸친 "최근 올라온 사진" 머리말과
 * 첫 줄 사진이 하이드레이션을 기다리며 비지 않게 하려는 것이다.
 *
 * 예전에는 이 파일 전체가 클라이언트 컴포넌트였고 framer-motion으로 같은 일을
 * 했다. 상태도 효과도 핸들러도 없는 490줄이 등장 효과 하나 때문에 통째로
 * 하이드레이션됐다. 이제 서버 컴포넌트이고, 클라이언트 섬은 `Reveal`과
 * `FadeImage`뿐이다. 값은 framer 때 맞춰 둔 그대로다: 0.7초,
 * cubic-bezier(0.22, 1, 0.36, 1), 24px. 머리말 블록은 25%, 목록의 칸은 15%가
 * 보이면 시작한다. 목록은 칸마다 자기 자리를 잰다 — CSS columns라 몇 번째
 * 칸이 첫 화면인지 인덱스로 알 수 없다.
 */
const RISE = { duration: 0.7, y: 24 } as const;
/** 섹션 머리말·닫는 띠처럼 한 덩어리로 올라오는 블록. */
const RISE_BLOCK = { ...RISE, amount: 0.25 } as const;
/** 사진 목록의 한 칸, 소품 카드 한 장. */
const RISE_ITEM = { ...RISE, amount: 0.15 } as const;

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
  const recentColumns = balanceColumns(recent, 4, photoRatio, 0.12);

  // 몇 년 전 오늘이 서너 장 이하면 masonry가 아니라 한 줄로 편다(`md`부터):
  // 칸마다 `flex-grow`가 그 사진의 비율이라 모든 사진의 높이가 같아지고 줄이
  // 폭을 채운다 — 자르지 않고. 줄의 높이는 `MEMORY_ROW`를 넘지 않는다.
  // 예전에는 두 장이 세 열 중 두 열에 앉아 오른쪽 3분의 1이 비었다.
  const MEMORY_ROW = 440;
  const memoryRow = onThisDay.length > 0 && onThisDay.length <= 3;
  const memoryRatios = onThisDay.map(photoRatio);
  const memoryRatioSum = memoryRatios.reduce((sum, r) => sum + r, 0);

  // Whether the copy can sit ON the photograph. A panorama leaves a frame too
  // short to carry it: at `md` a 3:1 photo is ~230px tall while the copy needs
  // ~300, and the absolutely-positioned block would spill out of the top of the
  // frame and into the nav. Past this ratio the copy stays in flow beneath the
  // photo at every width — the same treatment phones already get.
  //
  // A portrait photo takes the copy off the picture too, for the opposite
  // reason: its frame is a ~510px column on a 1440px screen with ~460px of
  // empty canvas either side, and the copy covered the lower half of the one
  // thing on the page worth looking at. From `lg` the copy sits in that empty
  // canvas beside the photo instead; below `lg` it sits beneath, as on phones.
  const split = heroAspect < 1;
  const overlaid = !split && heroAspect <= 2.2;
  /** Applies overlay-only classes, so one ratio decides layout AND palette. */
  const onPhoto = (classes: string) => (overlaid ? classes : '');

  // Widest the frame can ever be drawn: it is capped at `ratio × 76vh`, and
  // 76vh on a tall desktop viewport is ~850px. Without this the hero — the LCP
  // image — would advertise `100vw` and a portrait photo would fetch roughly
  // three times the pixels its narrow column can show.
  const heroWidth = Math.min(1400, Math.round(heroAspect * 850));

  return (
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
        {/* 히어로는 framer-motion의 `initial="hidden"`을 쓰지 않는다. 그러면
            서버 HTML이 사진과 <h1>을 opacity 0으로 내보내고, JS가 받아져
            하이드레이션이 끝날 때까지 첫 화면이 비어 있다 — 이 사진이 사이트
            정문의 LCP다. 사진은 처음부터 보이고, 문구만 CSS 애니메이션
            (`.hero-rise`)으로 살짝 올라온다. 불투명도는 건드리지 않으므로
            JS와 상관없이 첫 페인트에 다 보인다. */}
        <div
          className={`@container relative mx-auto w-full ${split ? 'max-w-[1400px] lg:flex lg:items-end lg:justify-center lg:gap-14 xl:gap-20' : ''}`}
          style={
            split
              // The photo's own width, shared with the copy below `lg` so the
              // two line up as one column. `min(100%, …)` resolves where used.
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
              alt="phorage 대표 이미지 — 초록을 수집하다"
              sizes={`(max-width: ${heroWidth}px) 100vw, ${heroWidth}px`}
              /* Next 16 replaces `priority` with `preload`. Here it is the
                 right migration and not just a rename: one photograph, above
                 the fold at every width, and the LCP element of the site's
                 front door — exactly the case the docs reserve `preload`
                 for. (The masonry grids get `loading`/`fetchPriority`
                 instead; see the note in `ArchiveGrid`.) */
              preload
              /* `preload` 혼자서는 우선순위를 올리지 않는다 — next/image는
                 <link rel=preload>와 <img> 어느 쪽에도 fetchpriority를 붙이지
                 않고, 브라우저는 레이아웃 전까지 이미지를 Low로 받는다.
                 Lighthouse(lcp-discovery)가 짚은 것이 이것이고, 그동안 High로
                 preload되던 woff2 다섯 개가 이 사진과 대역폭을 다퉜다(폰트
                 쪽은 layout.tsx의 mono 주석). fetchPriority는 두 태그 모두에
                 그대로 실린다. */
              fetchPriority="high"
            />
            {/* Only needed where the copy actually sits on the picture. */}
            {overlaid && (
              <div aria-hidden className="scrim-hero absolute inset-0 hidden md:block" />
            )}
          </div>

          <div
            className={`hero-rise mt-7 ${onPhoto('md:mt-0 md:absolute md:inset-x-0 md:bottom-0 md:p-10 lg:p-14 md:isolate')} ${
              split ? 'max-lg:mx-auto max-lg:max-w-[var(--hero-w)] lg:mt-0 lg:max-w-[32rem] lg:pb-2' : ''
            }`}
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
              phorage
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
                사진 보러 가기
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
          </div>
        </div>
      </section>

      {/* ── 최근 아카이브 ─────────────────────────────────────────────────────
           DESIGN.md § Rhythm: canvas → cream 띠 → canvas → forest 띠 → 푸터.
           홈은 히어로 한 장 뒤에 바로 푸터였고, 이 사이트의 본문인 사진은
           홈 어디에도 없었다. 사진마다 그 사진의 페이지(`/archive/[slug]/[id]`)로
           간다 — 예전에는 `?p=`로 앨범 전체를 내려받은 뒤 라이트박스를 열었다. */}
      {recent.length > 0 && (
        <section className="band-cream texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
          <div className="max-w-[1400px] mx-auto">
            <Reveal {...RISE_BLOCK} className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14">
              <div className="space-y-3">
                <p className="eyebrow eyebrow-marked text-primary">Recently archived</p>
                <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                  최근 올라온 사진
                </h2>
              </div>
              <Link href="/archive" className="btn-outline">사진 전체 보기</Link>
            </Reveal>

            {/* 사진의 비율을 그대로 두는 masonry. 정사각으로 자르면 "프레임이
                사진에 맞춘다"는 원칙이 홈에서 깨진다.

                CSS `columns`가 아니라 미리 나눈 네 열이다(`balanceColumns`).
                순서대로 흘려 넣으면 세로 사진이 몰린 열이 한 장만큼 길어져, 띠의
                끝에 사진 한 장 크기의 빈칸이 남았다. 네 열을 둘씩 묶어 두므로
                `lg` 아래에서는 묶음이 한 열로 이어져 두 열이 된다 — 묶음끼리도
                높이가 비슷하다. 캡션과 간격(열 폭의 약 12%)도 높이에 센다. */}
            <div className="grid grid-cols-2 items-start gap-3 md:gap-5">
              {[0, 2].map(half => (
                <div key={half} className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3 md:gap-5">
                  {recentColumns.slice(half, half + 2).map((column, c) => (
                    <ul key={c} className="flex flex-col gap-3 md:gap-5">
                      {column.map(photo => {
                        // 최근 사진의 제목은 파일명에서 자동 생성된 것이 많다
                        // ("54D43E53 EFB0 …"). 여기서는 장소와 연도만 적는다 — 제목을
                        // 넘기지 않아야 "제목과 같은 장소" 접기에 장소가 먹히지 않는다.
                        const meta = joinCaption(photoCaption({ location: photo.location, year: photo.year }).meta);
                        return (
                          <Reveal as="li" {...RISE_ITEM} key={photo.id}>
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
                                  sizes="(min-width: 1480px) 335px, (min-width: 1024px) 23vw, 47vw"
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
          {/* 한 줄로 펴는 날(`memoryRow`)에는 `lg`부터 머리말을 왼쪽에, 사진 줄을
              오른쪽에 둔다. 줄의 높이 상한 때문에 두 장이면 줄이 ~900px에서
              멈추는데, 머리말 아래에 두면 그 오른쪽이 그대로 비었다. */}
          <div
            className={`max-w-[1400px] mx-auto ${
              memoryRow ? 'lg:grid lg:grid-cols-[minmax(14rem,1fr)_auto] lg:items-end lg:gap-16' : ''
            }`}
          >
            <Reveal {...RISE_BLOCK} className={`mb-8 md:mb-10 space-y-3 ${memoryRow ? 'lg:mb-10' : ''}`}>
              <p className="eyebrow eyebrow-marked text-primary">On this day</p>
              <h2 id="on-this-day-title" className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                몇 년 전 오늘
              </h2>
              {!onThisDay.some(photo => photo.exact) && (
                <p className="text-[15px] text-slate">이 즈음 찍은 사진은 이렇습니다.</p>
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
                  // `Reveal`은 style을 받지 않으므로 비율(`flex`)은 바깥 <li>가 든다.
                  <li
                    key={photo.id}
                    className="break-inside-avoid min-w-0"
                    style={memoryRow ? { flex: `${memoryRatios[index].toFixed(3)} 1 0%` } : undefined}
                  >
                  <Reveal {...RISE_ITEM}>
                    <Link href={photoPagePath(photo)} className="group block">
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
                      <p className="mt-2 text-[13px] font-medium text-ink-body group-hover:text-primary transition-colors">
                        {when}
                      </p>
                      {place && <p className="eyebrow text-[10px] text-slate">{place}</p>}
                    </Link>
                  </Reveal>
                  </li>
                );
              })}
            </ul>
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
          <Reveal {...RISE_BLOCK} className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14">
            <div className="space-y-3">
              <p className="eyebrow eyebrow-marked text-muted-foreground">New collectibles</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-[-0.01em] text-ink break-keep">
                이번 달 새로 나온 소품
              </h2>
            </div>
            <Link href="/shop" className="btn-outline">소품 전체 보기</Link>
          </Reveal>

          {/* 소품 수에 맞춘 배치. 네 칸 그리드에 한두 장만 놓이면 띠의
              4분의 3이 비어, 섹션이 덜 만든 페이지처럼 보였다.
                1개   — 사진과 이름·가격을 나란히 크게 둔다. 사진은 자르지 않는다.
                2–3개 — 그 수만큼의 칸, 폭은 칸 수에 맞게 줄인다. */}
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
                    className="h-auto w-auto max-w-full max-h-[min(36rem,70svh)] rounded-lg border border-card-border bg-stone transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-accent/5" />
                )}
              </div>
              <div className="max-w-md">
                <p className="eyebrow text-muted-foreground">이번 달의 소품</p>
                <p className="mt-4 font-serif text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink group-hover:text-primary transition-colors">
                  {featured[0].name}
                </p>
                <p className="mt-4 text-lg font-mono tabular-nums text-primary">{formatPrice(featured[0].price)}</p>
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
                  <div className="aspect-square overflow-hidden rounded-md bg-stone border border-card-border">
                    {item.image_url ? (
                      <Image
                        src={cloudinary(item.image_url, { width: 600 })}
                        alt={item.name}
                        fill={false}
                        width={600}
                        height={600}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="(min-width: 1480px) 332px, (min-width: 1024px) 23vw, (min-width: 768px) 45vw, 47vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/5" />
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

      {/* ── 닫는 띠 ──────────────────────────────────────────────────────────
           페이지마다 forest 띠는 하나. 가장 앞에 내세울 행동은 아카이브이고,
           소품은 살 수 있는 것이 있을 때만 두 번째로 붙는다. */}
      <section className="band-dark texture-grain px-5 sm:px-6 md:px-10 py-16 md:py-24">
        <Reveal {...RISE_BLOCK} className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12">
          <div className="space-y-4 max-w-2xl">
            <p className="eyebrow eyebrow-marked text-moss">The Archive</p>
            <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight leading-[1.1] text-cream">
              {photoCount > 0
                ? `${albumCount}개의 앨범, ${photoCount.toLocaleString()}장의 사진`
                : '큰 일은 작은 창고에서 시작하더라구요.'}
            </h2>
            <p className="text-[15px] md:text-base leading-relaxed text-cream/75 max-w-[46ch]">
              사진을 앨범별로, 연도 또는 장소로 찾아볼 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
            <Link
              href="/archive"
              className="btn-primary bg-moss text-forest-black hover:bg-cream hover:text-forest-deep"
            >
              사진 보러 가기
            </Link>
            {hasShop && (
              <Link href="/shop" className="link-underline text-sm text-cream/85 hover:text-moss">
                소품 보러 가기
              </Link>
            )}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
