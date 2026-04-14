import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbums, getAlbumWithPhotos } from '@/lib/supabase';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getAlbumWithPhotos(slug);
  if (!result) return { title: 'Collection Not Found' };
  return {
    title: result.album.title,
    description: `${result.album.title} — ${result.photos.length} pieces in this collection.`,
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
    <main className="px-4 md:px-8 py-12 font-serif min-h-screen bg-[#FAF9F6]">

      {/* 헤더 */}
      <div className="max-w-[1400px] mx-auto mb-12 md:mb-16">
        <Link
          href="/archive"
          className="text-[9px] uppercase tracking-widest text-gray-400 font-sans hover:text-accent transition-colors"
        >
          &larr; Archive
        </Link>
        <div className="mt-8 border-b border-black/5 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-gray-400 mb-2">
              {photos.length} pieces
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#222]">
              {album.title}
            </h2>
          </div>
          <div className="w-12 h-[2px] bg-accent opacity-50 md:mb-2" />
        </div>
      </div>

      {/* 사진 그리드 — 원본 비율 자동 */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6 max-w-[1400px] mx-auto">
        {photos.map((photo) => (
          <div key={photo.id} className="break-inside-avoid group cursor-crosshair">
            <div className="relative overflow-hidden bg-gray-100">
              <Image
                src={photo.src}
                alt={photo.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-accent/5 group-hover:bg-transparent transition-all duration-700" />
            </div>
            <div className="mt-3 font-sans">
              <p className="text-[11px] font-semibold text-gray-700 group-hover:text-accent transition-colors">
                {photo.title}
              </p>
              <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 mt-0.5">
                {photo.location} · {photo.year}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 네비게이션 */}
      <div className="max-w-[1400px] mx-auto mt-20 pt-10 border-t border-black/5 flex justify-between items-center">
        <Link href="/archive" className="text-[10px] uppercase tracking-widest text-gray-400 font-sans hover:text-accent transition-colors">
          &larr; All Collections
        </Link>
        <Link href={`/archive/${nextAlbum.slug}`} className="text-[10px] uppercase tracking-widest text-gray-400 font-sans hover:text-accent transition-colors">
          Next: {nextAlbum.title} &rarr;
        </Link>
      </div>

      <div className="h-24" />
    </main>
  );
}
