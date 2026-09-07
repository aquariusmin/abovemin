"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';

const EASE = [0.22, 1, 0.36, 1] as const;

// Shared control affordance — high-contrast, ≥44px tap target, focus-safe.
// The photo now runs edge to edge behind these, so each control carries its
// own dark disc: over a blown-out sky a bare white glyph disappears entirely.
const CONTROL =
  'flex h-11 w-11 items-center justify-center rounded-full text-white/80 ' +
  'bg-forest-black/45 backdrop-blur-sm hover:text-white hover:bg-forest-black/70 ' +
  'transition-colors z-20 text-3xl font-sans leading-none';

interface Photo {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
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

  // Aspect ratio per photo id, learned on load — see the sizing note on the
  // <Image> below for why the frame cannot be measured from the picture.
  // Keyed rather than held as one value because a single <img> element is
  // reused across the whole album: on Next/Prev the old ratio would otherwise
  // still be sizing the frame while the new photo decoded, showing one visible
  // frame at the wrong shape. Keeping the map also makes stepping back to a
  // photo already seen size correctly on the first paint.
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const ratio = ratios[photo.id];

  const rememberRatio = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, dataset } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    // `onLoad` also fires for the blur/placeholder pass and, in dev, for
    // re-decodes; pin the value to the id the element is actually showing
    // rather than to whichever photo is current by the time this runs.
    const id = Number(dataset.photoId);
    if (!Number.isFinite(id)) return;
    setRatios(prev => (prev[id] ? prev : { ...prev, [id]: naturalWidth / naturalHeight }));
  }, []);

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
      className="fixed inset-0 z-[100] bg-forest-black/95 flex items-center justify-center"
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
        className={`absolute left-2 md:left-5 top-1/2 -translate-y-1/2 ${CONTROL}`}
        aria-label="Previous"
      >
        &lsaquo;
      </button>

      {/* Image — sized to the viewport, not to a box inset within it.
          The wrapper is a flex item with no width of its own, so it shrinks to
          exactly the rendered photo: everything around the picture is still
          backdrop, and clicking there still closes. That is what keeps
          click-outside-to-close working now that the photo reaches the edges,
          without re-enabling pointer events on the <img> (globals.css turns
          them off site-wide to blunt right-click saves). */}
      <motion.div
        className="relative flex max-h-[100dvh] max-w-[100vw]"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Image
          src={cloudinary(photo.src, { watermark: true, width: 2400 })}
          alt={photo.title}
          width={0}
          height={0}
          sizes="100vw"
          data-photo-id={photo.id}
          onLoad={rememberRatio}
          // The width is stated outright, `min(100vw, 100dvh × ratio)`, and the
          // height follows from it. The grid's `w-auto h-auto` is right for a
          // thumbnail and wrong here: it never draws past the intrinsic size,
          // and with a `w`-descriptor srcset that size is density corrected —
          // real pixels divided by (chosen candidate ÷ `sizes`). Archive
          // originals top out near 1500px, so a 3840w candidate had a 1500px
          // photo reporting ~560 CSS px and opening at a third of the screen.
          //
          // A single definite axis doesn't work either: Chromium clamps only
          // the axis that overflows its max and leaves the other one long, so
          // the element covers backdrop that `object-contain` draws nothing on
          // — measured both ways, a 390×844 box holding a 390×520 picture on a
          // phone, a 1440×900 box holding 675×900 on a desktop — and a tap
          // beside the photo hits the image instead of the overlay's close.
          // `min()` settles both axes at once, so the box measures the picture.
          //
          // `aspect-auto` is load-bearing. `width={0} height={0}` is how this
          // codebase says "dimensions unknown", but the browser still turns
          // those attributes into `aspect-ratio: 0 / 0`, and a height resolved
          // against a zero ratio is zero — the photo never appeared at all.
          className="aspect-auto object-contain max-w-[100vw] max-h-[100dvh]"
          style={
            ratio
              ? { width: `min(100vw, calc(100dvh * ${ratio}))`, height: 'auto' }
              // Pre-load, before any ratio is known. Collapsed rather than
              // guessed: a placeholder box at the wrong shape would snap to
              // another one a moment later, and the backdrop is already there.
              : { width: 'auto', height: 'auto' }
          }
          // `priority` is deprecated as of Next 16, and it was the wrong tool
          // here anyway: it preloads from the document <head>, and this element
          // does not exist until a visitor clicks. What we actually want is
          // "fetch this the instant it mounts, ahead of the queue", which is
          // exactly what the docs point deprecated `priority` users toward.
          loading="eager"
          fetchPriority="high"
          draggable={false}
        />
      </motion.div>

      {/* Caption — laid over the foot of the picture rather than stacked below
          it. Stacked, it stole its own height from the photo; over it, the
          photo gets the whole screen and the metadata still reads, carried by
          a scrim that fades out well before the middle of the frame. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-6 pt-16 text-center
                   bg-gradient-to-t from-forest-black/85 via-forest-black/45 to-transparent"
      >
        <p className="text-white text-sm font-serif font-medium tracking-tight">{photo.title}</p>
        <p className="eyebrow text-white/70 mt-1.5">
          {photo.location}&nbsp;&middot; {photo.year}&nbsp;&middot; {currentIndex + 1} / {photos.length}
        </p>
      </div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className={`absolute right-2 md:right-5 top-1/2 -translate-y-1/2 ${CONTROL}`}
        aria-label="Next"
      >
        &rsaquo;
      </button>
    </motion.div>
  );
}
