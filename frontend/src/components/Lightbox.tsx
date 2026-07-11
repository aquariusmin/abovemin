"use client";

import { useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { withWatermark } from '@/lib/cloudinary';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowLeft') { onPrev(); return; }
    if (e.key === 'ArrowRight') { onNext(); return; }
    // Trap Tab focus inside the dialog so keyboard users can't escape it.
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    // Move focus into the dialog on open.
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that opened the lightbox.
      previouslyFocused?.focus?.();
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
    >
      {/* Close button */}
      <button
        ref={closeRef}
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
          src={withWatermark(photo.src)}
          alt={photo.title}
          width={0}
          height={0}
          sizes="90vw"
          className="w-auto h-auto max-w-full max-h-[78vh] object-contain"
          priority
          draggable={false}
        />

        {/* Caption */}
        <div className="mt-4 text-center">
          <p className="text-white/85 text-sm font-serif font-medium tracking-tight">{photo.title}</p>
          <p className="eyebrow text-white/45 mt-1.5">
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
