import Image from 'next/image';
import { cloudinary } from '@/lib/cloudinary';
import { placeholderStyle } from '@/components/photo-placeholder';
import Reveal from '@/components/motion/Reveal';
import { displayFace } from '@/lib/typography';

interface AlbumCard {
  slug: string;
  cover: string;
  title: string;
  photo_count: number;
  width?: number | null;
  height?: number | null;
}

/** Each tile is a `Reveal` rendered as the <a> itself, so the parent's `[&>a]` selector still matches. */
export default function ArchiveGrid({ albums }: { albums: AlbumCard[] }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 max-w-[1400px] mx-auto [&>a]:mb-5 md:[&>a]:mb-6">
      {albums.map((album, i) => (
        <AlbumTile key={album.slug} album={album} index={i} />
      ))}
    </div>
  );
}

/** 등장 애니메이션은 마운트 때 뷰포트 아래에 있던 카드에만 걸린다 — 서버 HTML에서는 모두 보인다. */
function AlbumTile({ album, index }: { album: AlbumCard; index: number }) {
  return (
    <Reveal
      as="a"
      href={`/archive/${album.slug}`}
      className="break-inside-avoid group block relative overflow-hidden rounded-lg bg-stone"
      duration={0.6}
      y={24}
      amount={0.15}
    >
      {album.cover && (
        <div className="relative overflow-hidden rounded-lg" style={placeholderStyle(album.cover)}>
          {/* Not `preload`: the LCP tile depends on the column count, so `loading`/`fetchPriority` instead. */}
          <Image
            src={cloudinary(album.cover, { width: 800 })}
            alt={album.title}
            width={0}
            height={0}
            // `sizes`는 칸의 실제 폭(`PhotoGrid`와 같은 계산, 열 간격 20px → md부터 24px).
            sizes="(min-width: 1480px) 451px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, calc(100vw - 40px)"
            className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-105"
            // 비율만 쓴다. `auto`가 앞에 있어 표지가 오면 실제 비율이 이긴다.
            style={album.width && album.height ? { aspectRatio: `auto ${album.width} / ${album.height}` } : undefined}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : undefined}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-52 md:h-56 bg-gradient-to-t from-forest-black/85 via-forest-black/60 via-50% to-transparent transition-opacity duration-500 group-hover:opacity-90"
          />

          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
            <p className="eyebrow text-moss mb-2">{album.photo_count} pieces</p>
            <h2 className={`${displayFace(album.title)} text-xl md:text-2xl font-medium tracking-tight text-cream`}>
              {album.title}
            </h2>
            <span className="mt-3 label-ko text-cream/85 translate-y-1 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              앨범 보기 →
            </span>
          </div>
        </div>
      )}
    </Reveal>
  );
}
