"use client";

import Image from 'next/image';
import Link from 'next/link';
import { cloudinary } from '@/lib/cloudinary';
import { motion, useReducedMotion } from 'framer-motion';

const MotionLink = motion.create(Link);

const EASE = [0.22, 1, 0.36, 1] as const;

interface AlbumCard {
  slug: string;
  cover: string;
  title: string;
  photo_count: number;
}

/**
 * Masonry album grid with a per-item scroll reveal. Kept as MotionLink so the
 * rendered <a> still matches the parent's `[&>a]` column-spacing selector and
 * the existing hover treatment (image zoom + gradient) is preserved verbatim.
 */
export default function ArchiveGrid({ albums }: { albums: AlbumCard[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 max-w-[1400px] mx-auto [&>a]:mb-5 md:[&>a]:mb-6">
      {albums.map((album, i) => (
        <MotionLink
          key={album.slug}
          href={`/archive/${album.slug}`}
          className="break-inside-avoid group block relative overflow-hidden rounded-lg bg-stone"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {album.cover && (
            <div className="relative overflow-hidden rounded-lg">
              <Image
                src={cloudinary(album.cover, { width: 800 })}
                alt={album.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-105"
                priority={i === 0}
              />
              {/* Forest-black scrim rather than neutral black — keeps the
                  photography warm and ties the overlay to the palette. */}
              <div className="absolute inset-0 bg-gradient-to-t from-forest-black/70 via-forest-black/15 to-transparent transition-opacity duration-500 group-hover:from-forest-black/55" />

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
        </MotionLink>
      ))}
    </div>
  );
}
