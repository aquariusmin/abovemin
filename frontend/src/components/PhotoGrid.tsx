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
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6 max-w-[1400px] mx-auto">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="break-inside-avoid group cursor-pointer"
            onClick={() => setLightboxIndex(i)}
          >
            <div className="relative overflow-hidden bg-gray-100">
              <Image
                src={withWatermark(photo.src)}
                alt={photo.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                draggable={false}
              />
              <div className="absolute inset-0 bg-accent/5 group-hover:bg-transparent transition-all duration-700" />
            </div>
            <div className="mt-2 md:mt-3 font-sans">
              <p className="text-[11px] font-semibold text-gray-700 group-hover:text-accent transition-colors">
                {photo.title}
              </p>
              <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 mt-0.5">
                {photo.location} &middot; {photo.year}
              </p>
            </div>
          </div>
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
