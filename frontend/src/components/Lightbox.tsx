"use client";

import { useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Photo {
  id: number;
  src: string;
  title: string;
  location: string;
  year: string;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: LightboxProps) {
  const photo = photos[currentIndex];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/50 hover:text-white text-2xl md:text-3xl font-sans transition-colors z-10 p-2"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-2xl md:text-3xl font-sans transition-colors z-10 p-2"
        aria-label="Previous"
      >
        &lsaquo;
      </button>

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.src}
          alt={photo.title}
          width={0}
          height={0}
          sizes="90vw"
          className="w-auto h-auto max-w-full max-h-[78vh] object-contain"
          priority
        />

        {/* Caption */}
        <div className="mt-4 text-center">
          <p className="text-white/80 text-sm font-serif font-semibold">{photo.title}</p>
          <p className="text-white/40 text-[10px] font-sans uppercase tracking-widest mt-1">
            {photo.location} &middot; {photo.year} &middot; {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-2xl md:text-3xl font-sans transition-colors z-10 p-2"
        aria-label="Next"
      >
        &rsaquo;
      </button>
    </div>
  );
}
