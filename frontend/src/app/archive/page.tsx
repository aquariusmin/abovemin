import { getAlbums, supabase } from '@/lib/supabase';

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
    <main className="px-4 md:px-8 py-16 font-serif min-h-screen bg-[#FAF9F6]">

      <header className="max-w-[1400px] mx-auto mb-12 md:mb-20">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-3 font-sans">
          The Archive
        </p>
        <p className="text-2xl md:text-3xl font-light italic text-[#333]">
          Yesterday's light, collected today.
        </p>
        <div className="w-12 h-[1px] bg-[#4A5D4E] mt-8 opacity-30" />
      </header>

      {/* Pinterest-style masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 space-y-5 md:space-y-6 max-w-[1400px] mx-auto">
        {albumsWithCount.map((album) => (
          <a
            key={album.slug}
            href={`/archive/${album.slug}`}
            className="break-inside-avoid group block relative overflow-hidden bg-gray-100 cursor-pointer"
          >
            {album.cover && (
              <div className="relative overflow-hidden">
                <img
                  src={album.cover}
                  alt={album.title}
                  className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500" />

                {/* 텍스트 오버레이 */}
                <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                  <div className="transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/60 mb-1.5">
                      {album.photo_count} pieces
                    </p>
                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      {album.title}
                    </h3>
                  </div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/80 font-sans font-bold border-b border-white/40 pb-0.5">
                      View Collection →
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4A5D4E] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            )}
          </a>
        ))}
      </div>

      <div className="h-24 md:h-32" />
    </main>
  );
}
