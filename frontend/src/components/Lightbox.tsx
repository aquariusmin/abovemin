"use client";

import { useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';

const EASE = [0.22, 1, 0.36, 1] as const;

// Shared control affordance — high-contrast, ≥44px tap target, focus-safe.
const CONTROL =
  'flex h-11 w-11 items-center justify-center rounded-full text-white/70 ' +
  'hover:text-white hover:bg-white/10 transition-colors z-10 text-3xl font-sans leading-none';

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
  const reduce = useReducedMotion();

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

  // Mount-only: lock scroll, capture/restore focus. Must NOT depend on
  // handleKeyDown, or focus would be yanked back to Close on every navigation.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    // Move focus into the dialog on open.
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      // Restore focus to the element that opened the lightbox.
      previouslyFocused?.focus?.();
    };
  }, []);

  // Keydown listener re-binds when handlers change, without stealing focus.
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      ref={dialogRef}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {/* Close button */}
      <button
        ref={closeRef}
        onClick={onClose}
        className={`absolute top-3 right-3 md:top-5 md:right-5 ${CONTROL}`}
        aria-label="Close"
      >
        &times;
      </button>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className={`absolute left-2 md:left-6 top-1/2 -translate-y-1/2 ${CONTROL}`}
        aria-label="Previous"
      >
        &lsaquo;
      </button>

      {/* Image */}
      <motion.div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Image
          src={cloudinary(photo.src, { watermark: true, width: 1800 })}
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
          <p className="text-white text-sm font-serif font-medium tracking-tight">{photo.title}</p>
          <p className="eyebrow text-white/70 mt-1.5">
            {photo.location} &middot; {photo.year} &middot; {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </motion.div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className={`absolute right-2 md:right-6 top-1/2 -translate-y-1/2 ${CONTROL}`}
        aria-label="Next"
      >
        &rsaquo;
      </button>
    </motion.div>
  );
}
