import Image from 'next/image';
import { cloudinary } from '@/lib/cloudinary';
import { placeholderStyle } from '@/components/photo-placeholder';
import Reveal from '@/components/motion/Reveal';

interface AlbumCard {
  slug: string;
  cover: string;
  title: string;
  photo_count: number;
  /** 표지 사진의 저장된 크기. 비율로만 쓴다 — 표지가 오기 전에 칸을 잡는다. */
  width?: number | null;
  height?: number | null;
}

/**
 * Masonry album grid with a per-item scroll reveal. Each tile is a `Reveal`
 * rendered as the link itself, so the <a> still matches the parent's `[&>a]`
 * column-spacing selector and the existing hover treatment (image zoom +
 * gradient) is preserved verbatim.
 *
 * A server component: the only client work on this grid is the reveal, and
 * `Reveal` is that island. It used to be a client component for framer's
 * `useReducedMotion` + `useInView`, which hydrated every tile's markup and
 * loaded the animation runtime for a fade-and-rise.
 */
export default function ArchiveGrid({ albums }: { albums: AlbumCard[] }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 max-w-[1400px] mx-auto [&>a]:mb-5 md:[&>a]:mb-6">
      {albums.map((album, i) => (
        <AlbumTile key={album.slug} album={album} index={i} />
      ))}
    </div>
  );
}

/**
 * 카드 한 장. 등장 애니메이션은 마운트 때 뷰포트 아래에 있던 카드에만 걸린다
 * — 열 기반 masonry에서 "첫 화면"을 인덱스로 셀 수 없는 이유는
 * `useBelowFoldReveal`의 주석. 값(0.6초, 24px, 15% 보이면 시작)은 framer로
 * 돌던 때와 같다.
 */
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
          {/* Next 16 deprecates `priority` in favour of `preload`, but a
              preload link is the wrong migration for a masonry grid: the
              column count changes with the viewport, so which tile is the
              LCP element is not knowable from the markup — the docs name
              this case explicitly and point at these two props instead.
              Same treatment the Lightbox already uses. */}
          <Image
            src={cloudinary(album.cover, { width: 800 })}
            alt={album.title}
            width={0}
            height={0}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-105"
            // 비율만 쓴다. `auto`가 앞에 있어 표지가 오면 실제 비율이 이긴다.
            style={album.width && album.height ? { aspectRatio: `auto ${album.width} / ${album.height}` } : undefined}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
          {/* Forest-black scrim rather than neutral black — keeps the
              photography warm and ties the overlay to the palette.

              The midpoint used to be `/15`, and that is where the caption
              actually sits: the "N pieces" eyebrow is the topmost line of
              the block, so it lands in the thinnest part of the gradient.
              Over a bright cover — the Japan album opens on a white sky —
              moss-green at 15% scrim was unreadable. These are the
              Lightbox caption's values (`/85 → /45`), which carry the same
              two-line treatment over arbitrary photographs. */}
          <div className="absolute inset-0 bg-gradient-to-t from-forest-black/85 via-forest-black/45 to-transparent transition-opacity duration-500 group-hover:from-forest-black/70" />

          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
            <p className="eyebrow text-moss mb-2">{album.photo_count} pieces</p>
            <h2 className="font-serif text-xl md:text-2xl font-medium tracking-tight text-cream">
              {album.title}
            </h2>
            <span className="mt-3 label-ko text-cream/85 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              컬렉션 보기 →
            </span>
          </div>
        </div>
      )}
    </Reveal>
  );
}
