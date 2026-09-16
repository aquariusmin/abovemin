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

export const metadata: Metadata = {
  title: 'Timeline',
  description: 'phorage 아카이브의 사진을 찍은 날짜순으로 — 연도와 달로 나눠 봅니다.',
  alternates: { canonical: '/archive/timeline' },
};

// `/archive`와 같다. `revalidateArchive()`가 사진이 바뀔 때 이 경로도 무효화한다.
export const revalidate = 300;

/**
 * 찍은 날짜순 아카이브.
 *
 * 앨범은 여행 단위이고 `/archive`의 필터는 조건을 고르는 도구라, "시간이 어떻게
 * 흘렀나"를 한눈에 보는 자리가 없었다. 여기서는 고를 것 없이 연도 → 달로 늘어놓고,
 * 사진마다 그 사진의 페이지로 간다.
 *
 * 서버 컴포넌트로만 그린다. 300장을 클라이언트 컴포넌트 props로 넘기면 그만큼이
 * RSC 페이로드에 한 번 더 실린다(`PhotoFilter`의 PAGE 주석) — 이 페이지는 넘겨
 * 보는 것 말고 할 일이 없어 JS가 필요 없다. 클라이언트 코드는 연도 색인 하나다.
 */
export default async function TimelinePage() {
  // 조회 실패도 빈 목록 — `/archive`와 같이, 프리렌더에서 터져 배포가 죽지 않게.
  const photos = await getAllPhotos().catch(() => []);
  const years = groupTimeline(photos);
  const dated = photos.filter(photo => photo.taken_at).length;

  return (
    <main className="px-5 sm:px-6 md:px-10 pt-14 md:pt-24 pb-16 md:pb-28 min-h-screen bg-canvas text-ink-body">
      <Reveal className="max-w-[1400px] mx-auto mb-6 md:mb-8" y={16}>
        <header className="space-y-6">
          <BackLink href="/archive">아카이브</BackLink>
          <div className="space-y-4">
            <p className="eyebrow eyebrow-marked text-primary">Timeline</p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink">
              찍은 날짜순으로
            </h1>
            {photos.length > 0 && (
              <p className="max-w-[60ch] text-[15px] md:text-base leading-relaxed text-slate">
                {photos.length}장을 촬영일 기준으로 연도와 달로 나눴습니다.
                {dated < photos.length && (
                  <> 촬영일이 기록되지 않은 {photos.length - dated}장은 그해의 <span className="whitespace-nowrap">&lsquo;날짜 미상&rsquo;에</span> 모았습니다.</>
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
          {/* 연도 색인. 고정 내비(72/88px) 바로 아래에 붙는다. 배경을 깔아야
              아래로 흘러가는 사진이 pill 사이로 비치지 않는다. */}
          <nav
            aria-label="연도로 이동"
            // 좌우 여백은 목록 안쪽에 둔다 — 폰에서 넘치는 pill이 여백선에서 잘리지 않고
            // 화면 끝까지 흘러가야 옆으로 밀 수 있다는 것이 보인다.
            className="sticky top-[72px] md:top-[88px] z-30 -mx-5 sm:-mx-6 md:-mx-10 bg-canvas/92 backdrop-blur-md border-b border-hairline"
          >
            <TimelineYearIndex years={years.map(({ anchor, label, count }) => ({ anchor, label, count }))} />
          </nav>

          {years.map(year => (
            <section
              key={year.anchor}
              id={year.anchor}
              aria-labelledby={`${year.anchor}-title`}
              // 앵커로 왔을 때 제목이 고정 내비 + 색인 뒤에 숨지 않게.
              className="scroll-mt-[140px] md:scroll-mt-[156px] pt-12 md:pt-16"
            >
              <div className="flex items-baseline gap-3 border-b border-hairline pb-3">
                <h2 id={`${year.anchor}-title`} className="font-serif text-4xl md:text-5xl font-medium tracking-tight tabular-nums text-ink">
                  {year.label}
                </h2>
                <p className="text-sm text-slate tabular-nums">{year.count}장</p>
              </div>

              {year.months.map(month => (
                // 달 제목은 폰에서 사진 위, 데스크톱에서 왼쪽 칸. 칸 안에서 붙어
                // 있어서 긴 달(2025년 2월, 50장)을 내려가도 어느 달인지 보인다.
                <div key={month.key} className="mt-8 md:mt-10 md:grid md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8">
                  <h3 className="mb-3 md:mb-0 text-[15px] font-medium text-ink md:sticky md:top-[168px] md:self-start">
                    {month.label}
                    <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{month.photos.length}</span>
                  </h3>
                  {/* 자르지 않는 masonry. 저장된 비율로 칸을 먼저 잡으므로 lazy
                      로딩이 뷰포트 밖의 사진을 정말로 미룬다. */}
                  <ul className="columns-3 sm:columns-4 lg:columns-6 gap-2 md:gap-3 [&>li]:mb-2 md:[&>li]:mb-3">
                    {month.photos.map(photo => (
                      <li key={photo.id} className="break-inside-avoid">
                        <Link href={photoPagePath(photo)} className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          {/* 흐린 미리보기(`placeholderStyle`)는 여기에 깔지 않는다. CSS 배경은
                              lazy가 없어서, 300장짜리 이 페이지에서는 첫 화면에 미리보기
                              300개(약 270 KB, 요청 300건)가 한꺼번에 내려왔다(측정). 칸은
                              저장된 비율로 이미 잡혀 있어 bg 토큰만으로도 흔들리지 않는다. */}
                          <span className="block overflow-hidden rounded-sm bg-stone">
                            <Image
                              src={cloudinary(photo.src, { watermark: true, width: 480 })}
                              alt={photoLabel(photo)}
                              width={0}
                              height={0}
                              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 220px"
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
