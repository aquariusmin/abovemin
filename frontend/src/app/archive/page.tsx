import type { Metadata } from 'next';
import { getAlbums, supabase } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';
import ArchiveGrid from '@/components/archive/ArchiveGrid';

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

      <Reveal className="max-w-[1400px] mx-auto mb-14 md:mb-20" y={16}>
        <header className="space-y-6">
          <p className="eyebrow text-accent">The Archive</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink max-w-[16ch]">
            Yesterday&rsquo;s light,<br className="hidden sm:block" /> collected today.
          </h1>
          <div className="rule max-w-[1400px]" />
        </header>
      </Reveal>

      {albumsWithCount.length > 0 ? (
        <ArchiveGrid albums={albumsWithCount} />
      ) : (
        <p className="glass max-w-[1400px] mx-auto text-center text-sm text-muted py-20">
          아직 공개된 컬렉션이 없습니다.
        </p>
      )}

      <div className="h-16 md:h-24" />
    </main>
  );
}
