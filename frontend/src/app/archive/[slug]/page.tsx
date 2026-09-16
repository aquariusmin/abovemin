import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbumsWithCounts, getAlbumWithPhotos } from '@/lib/supabase';
import PhotoGrid from '@/components/PhotoGrid';
import Reveal from '@/components/motion/Reveal';
import BackLink from '@/components/BackLink';

/**
 * 공개할 앨범 = 사진이 한 장이라도 있는 앨범.
 *
 * 관리 화면에서 앨범을 먼저 만들고 사진을 나중에 올리는 순서가 자연스러워서,
 * 빈 앨범은 언제든 생긴다("2027 Calendar"). 그 앨범이 목록에 "0 pieces"와
 * 남의 표지를 달고 나오고 있었다. 필터는 `lib/supabase`가 아니라 보여 주는
 * 쪽에 둔다 — 관리 화면은 빈 앨범도 봐야 한다.
 */
async function publicAlbums() {
  const albums = await getAlbumsWithCounts().catch(() => []);
  return albums.filter(a => a.photo_count > 0);
}

// 사진이 바뀌는 순간은 관리 화면이 알고 있고, 그때 `revalidateArchive()`가
// 이 경로를 무효화한다. 그래서 방문마다 다시 읽을 이유가 없다 — 여기 숫자는
// 그 신호를 놓쳤을 때를 위한 안전망이다.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getAlbumWithPhotos(slug);
  if (!result || result.photos.length === 0) return { title: 'Collection Not Found' };
  const description = `${result.album.title} — ${result.photos.length} pieces in this collection.`;
  return {
    title: result.album.title,
    description,
    alternates: { canonical: `/archive/${slug}` },
    openGraph: {
      title: result.album.title,
      description,
      ...(result.album.cover ? { images: [{ url: result.album.cover }] } : {}),
    },
  };
}

/**
 * 빌드 시점에 미리 구울 앨범 목록.
 *
 * 조회가 실패하면 빈 배열을 준다. 이게 없으면 배포 순간 Supabase가 잠깐
 * 흔들리기만 해도 **빌드 전체가 죽는다** — 실제로 `Failed to collect page data`로
 * 확인했다. 사이트의 다른 모든 부분은 데이터가 없는 경우를 이미 처리하고
 * 있는데(빈 상태·에러 상태, `sitemap.ts`의 `.catch(() => [])`) 여기만
 * 예외였다.
 *
 * 빈 배열이어도 라우트가 사라지지는 않는다. `dynamicParams`가 기본으로 켜져
 * 있어 첫 요청 때 서버에서 그려지고, 그 뒤로는 평소의 ISR을 탄다. 미리 굽지
 * 못하는 것이 배포에 실패하는 것보다 낫다.
 */
export async function generateStaticParams() {
  const albums = await publicAlbums();
  return albums.map(a => ({ slug: a.slug }));
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, albums] = await Promise.all([
    getAlbumWithPhotos(slug),
    // 앨범 목록은 이전/다음 링크에만 쓰인다. 그것 하나 때문에 페이지가
    // 통째로 실패할 이유가 없다 (`publicAlbums`가 실패를 빈 배열로 바꾼다).
    publicAlbums(),
  ]);

  // 사진이 없는 앨범은 공개된 컬렉션이 아니다. "아직 사진이 없습니다" 화면을
  // 200으로 내보내면 검색엔진에게는 빈 페이지 하나가 색인할 문서가 된다.
  if (!result || result.photos.length === 0) notFound();
  const { album, photos } = result;

  // 빈 앨범을 건너뛴 순서 안에서 앞뒤를 고른다. 목록이 비었거나 이 앨범이
  // 그 안에 없으면(조회 실패) 링크를 빼는 쪽이 맞다 — `albums[NaN]`은 터진다.
  // 앨범이 하나뿐이면 앞뒤가 자기 자신이라 역시 뺀다.
  const currentIdx = albums.findIndex(a => a.slug === slug);
  const hasNeighbours = currentIdx >= 0 && albums.length > 1;
  const prevAlbum = hasNeighbours ? albums[(currentIdx - 1 + albums.length) % albums.length] : null;
  const nextAlbum = hasNeighbours ? albums[(currentIdx + 1) % albums.length] : null;

  return (
    <main className="px-5 sm:px-6 md:px-10 py-14 md:py-24 min-h-screen bg-canvas text-ink-body">

      {/* Header — /archive와 같은 틀(eyebrow-marked → 제목 → rule-accent).
          예전에는 제목 옆 48px 대시와 그 아래 hairline이 따로 있어서, 폰에서
          둘이 위아래로 쌓여 선이 두 번 그어진 것처럼 보였다. */}
      <Reveal className="max-w-[1400px] mx-auto mb-12 md:mb-16" y={16}>
        <header className="space-y-6">
          <BackLink href="/archive">아카이브</BackLink>
          <div className="space-y-4">
            <p className="eyebrow eyebrow-marked text-primary">{photos.length} pieces</p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink">
              {album.title}
            </h1>
          </div>
          <div className="rule-accent" />
        </header>
      </Reveal>

      {/* Photo grid + lightbox */}
      <PhotoGrid photos={photos} />

      {/* 이전 / 다음 컬렉션. 한 앨범을 다 본 사람이 목록으로 되돌아가지 않고
          다음 이야기로 넘어가게 한다. */}
      {(prevAlbum || nextAlbum) && (
        <Reveal className="max-w-[1400px] mx-auto mt-16 md:mt-24 pt-8 md:pt-10 border-t border-hairline" y={16}>
          <nav aria-label="다른 컬렉션" className="grid grid-cols-2 gap-4 md:gap-6">
          {prevAlbum && (
            <Link
              href={`/archive/${prevAlbum.slug}`}
              className="group card-hair px-5 py-4 md:px-6 md:py-5 min-w-0"
            >
              <span className="label-ko text-muted-foreground">&larr; 이전 컬렉션</span>
              <span className="mt-1 block font-serif text-lg md:text-2xl font-medium tracking-tight text-ink group-hover:text-primary transition-colors truncate">
                {prevAlbum.title}
              </span>
            </Link>
          )}
          {nextAlbum && (
            <Link
              href={`/archive/${nextAlbum.slug}`}
              className="group card-hair px-5 py-4 md:px-6 md:py-5 min-w-0 text-right col-start-2"
            >
              <span className="label-ko text-muted-foreground">다음 컬렉션 &rarr;</span>
              <span className="mt-1 block font-serif text-lg md:text-2xl font-medium tracking-tight text-ink group-hover:text-primary transition-colors truncate">
                {nextAlbum.title}
              </span>
            </Link>
          )}
          </nav>
        </Reveal>
      )}

      <div className="h-8 md:h-12" />
    </main>
  );
}
