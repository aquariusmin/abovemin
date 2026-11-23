import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAllPhotos } from '@/lib/supabase';
import { cloudinary } from '@/lib/cloudinary';
import { photoLabel } from '@/lib/caption';
import { photoPagePath } from '@/lib/photo-share';
import { groupTimeline } from '@/lib/timeline';
import BackLink from '@/components/BackLink';
import Reveal from '@/components/motion/Reveal';
import TimelineYearIndex from '@/components/archive/TimelineYearIndex';
import { storedRatioStyle } from '@/components/photo-placeholder';
import { buildFallback } from '@/lib/build-phase';
import { sectionTitle, shareCard } from '@/lib/share-card';

const TITLE = 'Timeline';
const DESCRIPTION = 'phorage 아카이브의 사진을 찍은 날짜순으로, 연도와 달별로 봅니다.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/archive/timeline' },
  ...shareCard({ title: sectionTitle(TITLE), description: DESCRIPTION, path: '/archive/timeline' }),
};

export const revalidate = 300;

// 서버 컴포넌트로만 그린다 — 300장을 클라이언트 props로 넘기면 RSC 페이로드가 두 배가 된다.
export default async function TimelinePage() {
  // 조회 실패는 빌드 중에만 빈 목록 — `/archive`와 같다(`buildFallback`).
  const photos = await getAllPhotos().catch(buildFallback([]));
  const years = groupTimeline(photos);
  const dated = photos.filter(photo => photo.taken_at).length;

  return (
    <main className="px-5 sm:px-6 md:px-10 pt-14 md:pt-24 pb-16 md:pb-28 min-h-screen bg-canvas text-ink-body">
      <Reveal className="max-w-[1400px] mx-auto mb-6 md:mb-8" y={16}>
        <header className="space-y-6">
          <BackLink href="/archive">아카이브</BackLink>
          <div className="space-y-4">
            <p className="eyebrow eyebrow-marked text-primary">Timeline</p>
            <h1 className="font-display-ko text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] text-ink">
              찍은 날짜순으로
            </h1>
            {photos.length > 0 && (
              <p className="max-w-[60ch] text-[15px] md:text-base leading-relaxed text-slate">
                {photos.length}장을 찍은 날짜에 따라 연도와 달로 나눴습니다.
                {dated < photos.length && (
                  <> 날짜가 없는 {photos.length - dated}장은 그해의 <span className="whitespace-nowrap">&lsquo;날짜 미상&rsquo;에</span> 모았습니다.</>
                )}
              </p>
            )}
          </div>
          <div className="rule-accent" />
        </header>
      </Reveal>

      {years.length === 0 ? (
        <p className="max-w-[1400px] mx-auto text-center text-sm text-muted-foreground py-20 border border-dashed border-hairline rounded-lg">
          아직 공개된 사진이 없습니다.
        </p>
      ) : (
        <div className="max-w-[1400px] mx-auto">
          <nav
            aria-label="연도로 이동"
            className="sticky top-[72px] md:top-[88px] z-30 -mx-5 sm:-mx-6 md:-mx-10 bg-canvas/92 backdrop-blur-md border-b border-hairline"
          >
            <TimelineYearIndex years={years.map(({ anchor, label, count }) => ({ anchor, label, count }))} />
          </nav>

          {years.map(year => (
            <section
              key={year.anchor}
              id={year.anchor}
              aria-labelledby={`${year.anchor}-title`}
              className="scroll-mt-[140px] md:scroll-mt-[156px] pt-12 md:pt-16"
            >
              <div className="flex items-baseline gap-3 border-b border-hairline pb-3">
                <h2 id={`${year.anchor}-title`} className="font-serif text-3xl md:text-4xl font-medium tracking-tight tabular-nums text-ink">
                  {year.label}
                </h2>
                <p className="text-sm text-slate tabular-nums">{year.count}장</p>
              </div>

              {year.months.map(month => (
                <div key={month.key} className="mt-8 md:mt-10 md:grid md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8">
                  <h3 className="mb-3 md:mb-0 text-[15px] font-medium text-ink md:sticky md:top-[168px] md:self-start">
                    {month.label}
                    <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{month.photos.length}</span>
                  </h3>
                  <ul className="columns-3 sm:columns-4 lg:columns-6 gap-2 md:gap-3 [&>li]:mb-2 md:[&>li]:mb-3">
                    {month.photos.map(photo => (
                      <li key={photo.id} className="break-inside-avoid">
                        <Link href={photoPagePath(photo)} className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          {/* 여기엔 흐린 미리보기를 깔지 않는다 — CSS 배경은 lazy가 없어 300개가 한꺼번에 내려온다. */}
                          <span className="block overflow-hidden rounded-sm bg-stone">
                            <Image
                              src={cloudinary(photo.src, { watermark: true, width: 480 })}
                              alt={photoLabel(photo)}
                              width={0}
                              height={0}
                              // 칸의 실제 폭(md부터 달 제목 칸 176px 제외): ~639 31vw, 640 23vw, 768 18vw, 1024 14vw, 1480 194px.
                              sizes="(min-width: 1480px) 194px, (min-width: 1024px) 14vw, (min-width: 768px) 18vw, (min-width: 640px) 23vw, 31vw"
                              className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.04]"
                              style={storedRatioStyle(photo)}
                              loading="lazy"
                              draggable={false}
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
