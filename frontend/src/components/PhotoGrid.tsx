"use client";

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Lightbox from './Lightbox';
import { cloudinary } from '@/lib/cloudinary';

const EASE = [0.22, 1, 0.36, 1] as const;

interface Photo {
  id: number;
  src: string;
  title: string;
  location: string;
  year: string;
}

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  if (photos.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto border border-hairline rounded-lg py-20 md:py-28 px-6 text-center">
        <p className="eyebrow text-muted">No pieces yet</p>
        <p className="mt-3 text-base text-slate break-keep">
          이 컬렉션에는 아직 공개된 사진이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 max-w-[1400px] mx-auto [&>button]:mb-4 md:[&>button]:mb-6">
        {photos.map((photo, i) => (
          <motion.button
            key={photo.id}
            type="button"
            className="break-inside-avoid group block w-full text-left cursor-pointer"
            onClick={() => setLightboxIndex(i)}
            aria-label={`${photo.title} 크게 보기`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="relative overflow-hidden rounded-md bg-stone">
              <Image
                src={cloudinary(photo.src, { watermark: true, width: 800 })}
                alt={photo.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                draggable={false}
                priority={i === 0}
              />
            </div>
            <div className="mt-3">
              <p className="text-[13px] font-medium text-ink-body group-hover:text-accent transition-colors">
                {photo.title}
              </p>
              <p className="eyebrow text-muted mt-1">
                {photo.location} &middot; {photo.year}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            key="lightbox"
            photos={photos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
            onNext={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
