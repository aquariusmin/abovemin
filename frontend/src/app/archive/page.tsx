import type { Metadata } from 'next';
import Link from 'next/link';
import { getAlbumsWithCounts, getAllPhotos, getPlaces } from '@/lib/supabase';
import { buildMapPlaces } from '@/lib/places';
import { publicIdFromUrl } from '@/lib/cloudinary';
import Reveal from '@/components/motion/Reveal';
import ArchiveGrid from '@/components/archive/ArchiveGrid';
import PhotoFilter from '@/components/archive/PhotoFilter';

export const metadata: Metadata = {
  title: 'Archive',
  description: "Yesterday's light, collected today. phorage의 사진 아카이브.",
  alternates: { canonical: "/archive" },
};

// 업로드/삭제 시 `revalidateArchive()`가 이 경로를 무효화한다. 300초는
// 그 신호를 놓쳤을 때의 안전망.
export const revalidate = 300;

export default async function Archive() {
  // 조회 실패도 "앨범 0개"로 다룬다. 아래에 이미 그 상태의 화면이 있는데,
  // 예외가 거기까지 가지 못하게 막고 있었다 — 프리렌더 단계에서 터지면
  // 배포 전체가 죽는다.
  const [albumsWithCount, allPhotos, places] = await Promise.all([
    getAlbumsWithCounts().catch(() => []),
    getAllPhotos().catch(() => []),
    // 좌표가 없으면(테이블이 없어도) 빈 목록 — 지도 토글이 나타나지 않는다.
    getPlaces().catch(() => []),
  ]);

  // 사진이 없는 앨범은 목록에 올리지 않는다. "2027 Calendar"가 "0 pieces"와
  // 호주 앨범의 표지를 빌려 달고 나와, 같은 사진이 그리드에 두 번 보였다.
  // 관리 화면은 빈 앨범도 봐야 하므로 조회가 아니라 여기서 거른다.
  const albums = albumsWithCount.filter(a => a.photo_count > 0);

  // 표지의 비율. 표지는 그 앨범 사진 중 하나라 사진 행에 저장된 크기가 있다 —
  // 같은 파일인지는 URL이 아니라 public_id로 본다(표지 URL에는 변환이 박혀 있다).
  // 비율로 칸을 먼저 잡지 않으면, 표지가 뜨는 동안 아래의 "전체에서 찾기"가
  // 계속 밀려 내려가서 사진 페이지의 카메라 링크(`#archive-search`)가 엉뚱한
  // 곳에 도착했다(390px에서 측정: 제목이 화면 아래 1,700px).
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
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink max-w-[16ch]">
            Yesterday&rsquo;s light,<br className="hidden sm:block" /> collected today.
          </h1>
          <div className="rule-accent max-w-[1400px]" />
        </header>
      </Reveal>

      {albums.length > 0 ? (
        <ArchiveGrid albums={albumCards} />
      ) : (
        <p className="max-w-[1400px] mx-auto text-center text-sm text-muted-foreground py-20 border border-dashed border-hairline rounded-lg">
          아직 공개된 컬렉션이 없습니다.
        </p>
      )}

      {/* 앨범을 가로지르는 보기. 컬렉션은 이야기 단위이고, 이쪽은 "2019년"이나
          "Seoul"처럼 이야기를 가로지르는 질문을 위한 것이다. 앨범 아래에 두는
          이유도 그것이다 — 이 사이트가 먼저 제안하는 것은 컬렉션이다. */}
      {allPhotos.length > 0 && (
        <section className="mt-20 md:mt-28" aria-labelledby="archive-search">
          <Reveal className="max-w-[1400px] mx-auto mb-8 md:mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-5" y={16}>
            <div className="space-y-4">
              <p className="eyebrow eyebrow-marked text-primary">Across the archive</p>
              {/* `scroll-mt`: 사진 페이지의 카메라 링크(`#archive-search`)로 왔을 때
                  제목이 고정 내비 뒤에 숨지 않게. */}
              <h2 id="archive-search" className="scroll-mt-[96px] md:scroll-mt-[112px] font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
                전체에서 찾기
              </h2>
              <p className="text-[15px] text-slate">
                컬렉션과 상관없이 연도·장소·카메라로 좁혀 봅니다.
              </p>
            </div>
            {/* 고르지 않고 시간순으로 늘어놓은 보기. 상단 내비가 아니라 여기 둔다 —
                아카이브 안의 또 다른 보기이지 사이트의 새 장이 아니다. */}
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
