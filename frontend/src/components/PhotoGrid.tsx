"use client";

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';
import { withWatermark } from '@/lib/cloudinary';

interface Photo {
  id: number;
  src: string;
  title: string;
  location: string;
  year: string;
}

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 max-w-[1400px] mx-auto [&>button]:mb-4 md:[&>button]:mb-6">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className="break-inside-avoid group block w-full text-left cursor-pointer"
            onClick={() => setLightboxIndex(i)}
            aria-label={`${photo.title} 크게 보기`}
          >
            <div className="relative overflow-hidden rounded-md bg-stone">
              <Image
                src={withWatermark(photo.src)}
                alt={photo.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                draggable={false}
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
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
        />
      )}
    </>
  );
}
