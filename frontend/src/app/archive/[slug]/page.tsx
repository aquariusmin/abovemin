import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbums, getAlbumWithPhotos } from '@/lib/supabase';
import PhotoGrid from '@/components/PhotoGrid';
import Reveal from '@/components/motion/Reveal';

// 사진이 바뀌는 순간은 관리 화면이 알고 있고, 그때 `revalidateArchive()`가
// 이 경로를 무효화한다. 그래서 방문마다 다시 읽을 이유가 없다 — 여기 숫자는
// 그 신호를 놓쳤을 때를 위한 안전망이다.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getAlbumWithPhotos(slug);
  if (!result) return { title: 'Collection Not Found' };
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
  const albums = await getAlbums().catch(() => []);
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
    // 앨범 목록은 "다음 컬렉션" 링크에만 쓰인다. 그것 하나 때문에 페이지가
    // 통째로 실패할 이유가 없다.
    getAlbums().catch(() => []),
  ]);

  if (!result) notFound();
  const { album, photos } = result;

  // 목록이 비었거나 이 앨범이 그 안에 없으면 `albums[NaN]`이 되어 아래에서
  // 터진다. 링크를 빼는 쪽이 맞다.
  const currentIdx = albums.findIndex(a => a.slug === slug);
  const nextAlbum =
    currentIdx >= 0 && albums.length > 0
      ? albums[(currentIdx + 1) % albums.length]
      : null;

  return (
    <main className="px-5 sm:px-6 md:px-10 py-10 md:py-16 min-h-screen bg-canvas text-ink-body">

      {/* Header */}
      <Reveal as="header" className="max-w-[1400px] mx-auto mb-12 md:mb-16" y={16}>
        <Link href="/archive" className="eyebrow text-muted-foreground hover:text-accent transition-colors">
          &larr; Archive
        </Link>
        <div className="mt-8 border-b border-hairline pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="eyebrow text-accent">{photos.length} pieces</p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-ink break-keep">
              {album.title}
            </h1>
          </div>
          <div className="w-12 h-[2px] bg-accent md:mb-3" />
        </div>
      </Reveal>

      {/* Photo grid + lightbox */}
      <PhotoGrid photos={photos} />

      {/* Bottom nav */}
      <Reveal className="max-w-[1400px] mx-auto mt-14 md:mt-20 pt-8 md:pt-10 border-t border-hairline flex justify-between items-center gap-4" y={16}>
        <Link href="/archive" className="label-ko text-muted-foreground hover:text-accent transition-colors">
          &larr; 전체 컬렉션
        </Link>
        {nextAlbum && (
          <Link href={`/archive/${nextAlbum.slug}`} className="label-ko text-muted-foreground hover:text-accent transition-colors text-right">
            다음 컬렉션 · {nextAlbum.title} &rarr;
          </Link>
        )}
      </Reveal>

      <div className="h-16 md:h-24" />
    </main>
  );
}
