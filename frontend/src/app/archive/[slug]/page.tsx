import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbumsWithCounts, getAlbumWithPhotos } from '@/lib/supabase';
import PhotoGrid from '@/components/PhotoGrid';
import Reveal from '@/components/motion/Reveal';
import BackLink from '@/components/BackLink';
import { albumFacts } from '@/lib/layout-photos';
import { cloudinaryOgImage, OG_HEIGHT, OG_WIDTH } from '@/lib/cloudinary';
import { shareCard } from '@/lib/share-card';
import { displayFace } from '@/lib/typography';

// 빈 앨범은 보여 주는 쪽에서 거른다 — 관리 화면은 빈 앨범도 봐야 한다.
async function publicAlbums() {
  const albums = await getAlbumsWithCounts().catch(() => []);
  return albums.filter(a => a.photo_count > 0);
}

// revalidateArchive()가 무효화한다. 이 숫자는 그 신호를 놓쳤을 때의 안전망이다.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getAlbumWithPhotos(slug);
  if (!result || result.photos.length === 0) return { title: 'Collection Not Found' };
  const { album } = result;
  const description =
    album.description?.trim() || `${album.title} — ${result.photos.length} pieces in this collection.`;
  const path = `/archive/${slug}`;
  // 커버를 그대로 실으면 4000px 원본이나 크롤러가 못 읽는 f_auto 포맷이 간다 — 1200×630으로.
  const og = album.cover ? cloudinaryOgImage(album.cover) : null;
  const images = og
    ? [{ url: og, width: OG_WIDTH, height: OG_HEIGHT, alt: album.title }]
    : album.cover
      ? [{ url: album.cover, alt: album.title }]
      : undefined;

  return {
    title: album.title,
    description,
    alternates: { canonical: path },
    // openGraph·twitter는 얕은 병합이라 사이트 이름·언어·종류·이미지를 다시 적는다.
    ...shareCard({ title: album.title, description, path, images }),
  };
}

// 조회 실패는 빈 배열 — 배포 순간 Supabase가 흔들려도 빌드가 죽지 않게(dynamicParams가 받친다).
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
    publicAlbums(),
  ]);

  // 사진 없는 앨범은 404 — 빈 페이지가 색인되지 않게.
  if (!result || result.photos.length === 0) notFound();
  const { album, photos } = result;
  const description = album.description?.trim() || null;
  const facts = albumFacts(photos);
  const factLine = [
    facts.years,
    facts.places.length > 0 ? `${facts.places.join(', ')}${facts.more > 0 ? ` 외 ${facts.more}곳` : ''}` : null,
  ].filter((v): v is string => Boolean(v));

  // 목록에 이 앨범이 없으면(조회 실패) 링크를 뺀다 — albums[NaN]은 터진다.
  const currentIdx = albums.findIndex(a => a.slug === slug);
  const hasNeighbours = currentIdx >= 0 && albums.length > 1;
  const prevAlbum = hasNeighbours ? albums[(currentIdx - 1 + albums.length) % albums.length] : null;
  const nextAlbum = hasNeighbours ? albums[(currentIdx + 1) % albums.length] : null;

  return (
    <main className="px-5 sm:px-6 md:px-10 py-14 md:py-24 min-h-screen bg-canvas text-ink-body">

      <Reveal className="max-w-[1400px] mx-auto mb-12 md:mb-16" y={16}>
        <header className="space-y-6">
          <BackLink href="/archive">아카이브</BackLink>
          <div className="space-y-4">
            <p className="eyebrow eyebrow-marked text-primary">{photos.length} pieces</p>
            <h1 className={`${displayFace(album.title)} text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] text-ink`}>
              {album.title}
            </h1>
            {factLine.length > 0 && (
              <p className="text-[15px] text-slate">
                {factLine.map((part, i) => (
                  <span key={part}>
                    {i > 0 && <>&nbsp;·{' '}</>}
                    {i === 0 ? <span className="tabular-nums">{part}</span> : part}
                  </span>
                ))}
              </p>
            )}
            {/* 평문이다 — 줄바꿈만 살리고(pre-line) 마크업은 해석하지 않는다. */}
            {description && (
              <p className="max-w-[60ch] pt-1 text-base md:text-lg leading-relaxed text-slate whitespace-pre-line">
                {description}
              </p>
            )}
          </div>
          <div className="rule-accent" />
        </header>
      </Reveal>

      <PhotoGrid photos={photos} feature />

      {(prevAlbum || nextAlbum) && (
        <Reveal className="max-w-[1400px] mx-auto mt-16 md:mt-24 pt-8 md:pt-10 border-t border-hairline" y={16}>
          <nav aria-label="다른 앨범" className="grid grid-cols-2 gap-4 md:gap-6">
          {prevAlbum && (
            <Link
              href={`/archive/${prevAlbum.slug}`}
              className="group card-hair px-5 py-4 md:px-6 md:py-5 min-w-0"
            >
              <span className="label-ko text-muted-foreground">&larr; 이전 앨범</span>
              <span className={`mt-1 block ${displayFace(prevAlbum.title)} text-lg md:text-2xl font-medium tracking-tight text-ink group-hover:text-primary transition-colors truncate`}>
                {prevAlbum.title}
              </span>
            </Link>
          )}
          {nextAlbum && (
            <Link
              href={`/archive/${nextAlbum.slug}`}
              className="group card-hair px-5 py-4 md:px-6 md:py-5 min-w-0 text-right col-start-2"
            >
              <span className="label-ko text-muted-foreground">다음 앨범 &rarr;</span>
              <span className={`mt-1 block ${displayFace(nextAlbum.title)} text-lg md:text-2xl font-medium tracking-tight text-ink group-hover:text-primary transition-colors truncate`}>
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
