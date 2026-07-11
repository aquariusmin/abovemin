import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAlbums, supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Archive',
  description: "Yesterday's light, collected today. phorage의 사진 아카이브.",
};

export const revalidate = 0;

export default async function Archive() {
  const albums = await getAlbums();

  const counts = await Promise.all(
    albums.map(a =>
      supabase.from('photos').select('id', { count: 'exact', head: true }).eq('album_slug', a.slug)
    )
  );

  const albumsWithCount = albums.map((a, i) => ({
    ...a,
    photo_count: counts[i].count ?? 0,
  }));

  return (
    <main className="px-5 sm:px-6 md:px-10 py-14 md:py-24 min-h-screen bg-canvas text-ink-body">

      <header className="max-w-[1400px] mx-auto mb-14 md:mb-20 space-y-6">
        <p className="eyebrow text-accent">The Archive</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink max-w-[16ch]">
          Yesterday&rsquo;s light,<br className="hidden sm:block" /> collected today.
        </h1>
        <div className="rule max-w-[1400px]" />
      </header>

      {albumsWithCount.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 max-w-[1400px] mx-auto [&>a]:mb-5 md:[&>a]:mb-6">
          {albumsWithCount.map(album => (
            <Link
              key={album.slug}
              href={`/archive/${album.slug}`}
              className="break-inside-avoid group block relative overflow-hidden rounded-lg bg-stone"
            >
              {album.cover && (
                <div className="relative overflow-hidden rounded-lg">
                  <Image
                    src={album.cover}
                    alt={album.title}
                    width={0}
                    height={0}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent transition-opacity duration-500 group-hover:from-black/45" />

                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <p className="eyebrow text-white/70 mb-2">{album.photo_count} pieces</p>
                    <h2 className="font-serif text-xl md:text-2xl font-medium tracking-tight text-white">
                      {album.title}
                    </h2>
                    <span className="mt-3 eyebrow text-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      View collection →
                    </span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="max-w-[1400px] mx-auto text-center text-sm text-muted py-20 border border-dashed border-hairline rounded-md">
          아직 공개된 컬렉션이 없습니다.
        </p>
      )}

      <div className="h-16 md:h-24" />
    </main>
  );
}
