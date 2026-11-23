import type { Metadata } from 'next';
import Link from 'next/link';
import { getAlbumsWithCounts, getAllPhotos, getPlaces } from '@/lib/supabase';
import { buildMapPlaces } from '@/lib/places';
import { publicIdFromUrl } from '@/lib/cloudinary';
import Reveal from '@/components/motion/Reveal';
import ArchiveGrid from '@/components/archive/ArchiveGrid';
import { buildFallback } from '@/lib/build-phase';
import PhotoFilter from '@/components/archive/PhotoFilter';
import { sectionTitle, shareCard } from '@/lib/share-card';

const TITLE = 'Archive';
const DESCRIPTION = 'phorage의 사진 아카이브. 다녀온 곳마다 앨범을 하나씩 만들어 모았습니다.';

// openGraph·twitter는 얕은 병합이라 shareCard로 카드를 다시 적는다 — 비우면 og:image가 빠진다.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/archive' },
  ...shareCard({ title: sectionTitle(TITLE), description: DESCRIPTION, path: '/archive' }),
};

// revalidateArchive()가 무효화한다. 300초는 그 신호를 놓쳤을 때의 안전망.
export const revalidate = 300;

export default async function Archive() {
  // 빌드 중에만 실패를 빈 목록으로 — 실행 중엔 던져 ISR이 마지막 성공 페이지를 유지한다.
  const [albumsWithCount, allPhotos, places] = await Promise.all([
    getAlbumsWithCounts().catch(buildFallback([])),
    getAllPhotos().catch(buildFallback([])),
    getPlaces().catch(() => []),
  ]);

  // 빈 앨범은 조회가 아니라 여기서 거른다 — 관리 화면은 빈 앨범도 봐야 한다.
  const albums = albumsWithCount.filter(a => a.photo_count > 0);

  // 표지 비율로 칸을 먼저 잡는다 — 안 잡으면 #archive-search 앵커가 엉뚱한 곳에 도착한다.
  const sizeById = new Map(
    allPhotos
      .filter(photo => photo.width && photo.height)
      .map(photo => [publicIdFromUrl(photo.src), { width: photo.width!, height: photo.height! }] as const),
  );
  const albumCards = albums.map(album => {
    const size = sizeById.get(publicIdFromUrl(album.cover));
    return {
      slug: album.slug,
      cover: album.cover,
      title: album.title,
      photo_count: album.photo_count,
      width: size?.width ?? null,
      height: size?.height ?? null,
    };
  });

  return (
    <main className="px-5 sm:px-6 md:px-10 py-14 md:py-24 min-h-screen bg-canvas text-ink-body">

      <Reveal className="max-w-[1400px] mx-auto mb-14 md:mb-20" y={16}>
        <header className="space-y-6">
          <p className="eyebrow eyebrow-marked text-primary">The Archive</p>
          <h1 className="font-display-ko text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] text-ink max-w-[16ch]">
            다녀온 곳마다,<br className="hidden sm:block" /> 앨범 하나씩.
          </h1>
          <div className="rule-accent max-w-[1400px]" />
        </header>
      </Reveal>

      {albums.length > 0 ? (
        <ArchiveGrid albums={albumCards} />
      ) : (
        <p className="max-w-[1400px] mx-auto text-center text-sm text-muted-foreground py-20 border border-dashed border-hairline rounded-lg">
          아직 공개된 앨범이 없습니다.
        </p>
      )}

      {allPhotos.length > 0 && (
        <section className="mt-20 md:mt-28" aria-labelledby="archive-search">
          <Reveal className="max-w-[1400px] mx-auto mb-8 md:mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-5" y={16}>
            <div className="space-y-4">
              <p className="eyebrow eyebrow-marked text-primary">Across the archive</p>
              <h2 id="archive-search" className="scroll-mt-[96px] md:scroll-mt-[112px] font-display-ko text-3xl md:text-4xl font-medium text-ink">
                전체에서 찾기
              </h2>
              <p className="text-[15px] text-slate">
                앨범과 상관없이 연도·장소·카메라로 찾습니다.
              </p>
            </div>
            <Link href="/archive/timeline" className="btn-outline gap-2">
              찍은 날짜순으로 보기 <span aria-hidden>&rarr;</span>
            </Link>
          </Reveal>
          <PhotoFilter photos={allPhotos} mapPlaces={buildMapPlaces(allPhotos, places)} />
        </section>
      )}

      <div className="h-16 md:h-24" />
    </main>
  );
}
