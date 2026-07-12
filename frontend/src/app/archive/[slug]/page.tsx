import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbums, getAlbumWithPhotos } from '@/lib/supabase';
import PhotoGrid from '@/components/PhotoGrid';
import Reveal from '@/components/motion/Reveal';

export const revalidate = 0;

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

export async function generateStaticParams() {
  const albums = await getAlbums();
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
    getAlbums(),
  ]);

  if (!result) notFound();
  const { album, photos } = result;

  const currentIdx = albums.findIndex(a => a.slug === slug);
  const nextAlbum = albums[(currentIdx + 1) % albums.length];

  return (
    <main className="px-5 sm:px-6 md:px-10 py-10 md:py-16 min-h-screen bg-canvas text-ink-body">

      {/* Header */}
      <Reveal as="header" className="max-w-[1400px] mx-auto mb-12 md:mb-16" y={16}>
        <Link href="/archive" className="eyebrow text-muted hover:text-accent transition-colors">
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
        <Link href="/archive" className="eyebrow text-muted hover:text-accent transition-colors">
          &larr; All collections
        </Link>
        <Link href={`/archive/${nextAlbum.slug}`} className="eyebrow text-muted hover:text-accent transition-colors text-right">
          Next: {nextAlbum.title} &rarr;
        </Link>
      </Reveal>

      <div className="h-16 md:h-24" />
    </main>
  );
}
