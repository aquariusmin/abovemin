"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';
import { exifParts, joinCaption, photoCaption, photoLabel } from '@/lib/caption';
import { photoShareUrl, printInquiryMailto } from '@/lib/photo-share';
import { copyToClipboard } from '@/lib/clipboard';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

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
  album_slug?: string;
  /** 촬영 정보 채우기 이후에만 있다(`lib/supabase`의 `Photo`). */
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: number | null;
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
  const caption = photoCaption(photo);
  const label = photoLabel(photo);
  const exif = exifParts(photo);
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
  // ── 링크 복사 ────────────────────────────────────────────────────────────
  // `?p=`가 생긴 이유가 "이 사진 한 장을 보여 주기"인데, 폰에서는 주소창을
  // 여는 것부터가 라이트박스를 가리는 일이었다. 버튼 하나로 링크를 넘긴다.
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copyLink = useCallback(async () => {
    // 앨범을 아는 사진이면 그 사진의 페이지(`/archive/[slug]/[id]`) 주소를
    // 건넨다. 받은 사람의 링크 미리보기에 앨범 표지가 아니라 이 사진이 뜨고,
    // `/archive`의 필터 그리드에서 연 사진도 목록 조건과 상관없이 열린다.
    // 예전에 건넨 `?p=` 링크는 `PhotoGrid`가 계속 연다.
    const url = photoShareUrl(photo, window.location.origin, window.location.href);
    const ok = await copyToClipboard(url);
    setCopyState(ok ? 'copied' : 'failed');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2000);
  }, [photo]);

  // ── 프린트 문의 ──────────────────────────────────────────────────────────
  // 마음에 든 사진을 "이거"라고 가리킬 방법이 메일에는 없었다. 복사 버튼과 같은
  // 링크를 본문에 넣은 메일을 미리 채워 연다. 라이트박스는 클릭한 뒤에만
  // 그려지므로 `window`가 있지만, 만약을 위해 서버에서는 정식 주소를 쓴다.
  const inquiryHref = printInquiryMailto(
    CONTACT_EMAIL,
    photo,
    typeof window === 'undefined'
      ? photoShareUrl(photo, SITE_URL, SITE_URL)
      : photoShareUrl(photo, window.location.origin, window.location.href),
  );

  const [ratios, setRatios] = useState<Record<number, number>>({});
  // 촬영 정보 채우기가 저장한 크기가 있으면 첫 그림부터 그 비율로 프레임을
  // 잡는다(아래 "Pre-load" 분기가 필요 없어진다). 비율만 쓴다 — 원본이 1500px
  // 안팎으로 줄어 있어 크기 자체는 뜻이 없다. 실제로 읽은 비율이 오면 그쪽이 이긴다.
  const storedRatio = photo.width && photo.height ? photo.width / photo.height : undefined;
  const ratio = ratios[photo.id] ?? storedRatio;

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
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]');
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

  // ── Swipe ───────────────────────────────────────────────────────────────
  // On a phone the arrows were the only way through an album of 45 photos,
  // and the obvious gesture did the wrong thing twice over: a swipe across
  // the picture did nothing (globals.css sets `pointer-events: none` on every
  // <img>, so the image never sees a touch), and a swipe across the letterbox
  // bands — 162px above and below a landscape photo on a 390×844 screen —
  // registered as a backdrop click and CLOSED the lightbox.
  //
  // So the dialog, not the image, owns the gesture. One pointer handler pair
  // decides between the two meanings a press can have:
  //
  //   moved sideways  → previous / next
  //   barely moved    → a tap, which closes only if it landed on backdrop
  //
  // That is also why `onClick={onClose}` is gone from this element: a click
  // fires at the end of a drag too, which is exactly the bug.
  const press = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    onPhoto: boolean;
  } | null>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  /** Past this many px a horizontal drag is a swipe, not a sloppy tap. */
  const SWIPE_PX = 45;

  /**
   * Decide what a finished press meant. Shared by `pointerup` and
   * `pointercancel`, because a swipe does not reliably end in `pointerup`:
   * the browser cancels the pointer when the thing under it changes mid-drag,
   * which here is the photo itself resizing the frame as the previous swipe
   * lands. Measured: every other swipe in a run arrived as `pointercancel`
   * with zeroed coordinates and was dropped. Hence the running `last*`, and
   * hence deciding from those rather than from the event.
   */
  const finishPress = useCallback(
    (dx: number, dy: number, onPhoto: boolean, cancelled: boolean) => {
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onNext();
        else onPrev();
        return;
      }
      // A cancelled pointer is never a tap — the browser took it away, the
      // reader did not lift a finger to dismiss anything.
      if (cancelled) return;
      // A tap on the photo does nothing: dismissing the thing you are looking
      // at because you touched it is not a gesture anyone means.
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !onPhoto) onClose();
    },
    [onClose, onNext, onPrev],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Controls handle themselves; don't let their press become a swipe.
    if ((e.target as HTMLElement).closest('button, a')) {
      press.current = null;
      return;
    }
    press.current = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      onPhoto: !!mediaRef.current?.contains(e.target as Node),
    };
    // Keep the events coming to this element even if the frame under the
    // pointer changes size mid-drag.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!press.current) return;
    press.current.lastX = e.clientX;
    press.current.lastY = e.clientY;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = press.current;
      press.current = null;
      if (!start) return;
      // Horizontal enough to be deliberate: a vertical drag (a scroll attempt)
      // must not flip the photo. Swiping left goes forward, matching the
      // direction the pictures move.
      finishPress(e.clientX - start.x, e.clientY - start.y, start.onPhoto, false);
    },
    [finishPress],
  );

  const onPointerCancel = useCallback(() => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    // `pointercancel` carries no useful coordinates (Chromium zeroes them), so
    // the last position seen by `pointermove` is what the gesture gets judged
    // on.
    finishPress(start.lastX - start.x, start.lastY - start.y, start.onPhoto, true);
  }, [finishPress]);

  return (
    <motion.div
      ref={dialogRef}
      // `select-none` keeps a drag from turning into a text selection, which
      // is one of the ways the browser takes the pointer away mid-swipe.
      // Opaque on phones. Any translucency let the neighbouring masonry
      // cards ghost through the letterbox bands above and below a landscape
      // photo — on a 390×844 screen those bands are 40% of the view.
      className="fixed inset-0 z-[100] bg-forest-black md:bg-forest-black/95 flex items-center justify-center touch-pan-y select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
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
        aria-label="닫기"
      >
        &times;
      </button>

      {/* Copy link — mirrors Close in the other corner. The label itself
          changes to the result, and the live region says it aloud. */}
      <button
        type="button"
        onClick={copyLink}
        className="absolute top-3 left-3 md:top-5 md:left-5 z-20 inline-flex h-11 items-center gap-2 rounded-full px-4
                   bg-forest-black/45 backdrop-blur-sm text-sm font-medium text-cream/85 hover:text-cream hover:bg-forest-black/70 transition-colors"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          {copyState === 'copied' ? (
            <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.6.6M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.6-.6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        {copyState === 'copied' ? '복사됨' : copyState === 'failed' ? '복사하지 못했어요' : '링크 복사'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copyState === 'copied' ? '사진 링크를 복사했습니다.' : copyState === 'failed' ? '링크를 복사하지 못했습니다. 주소창의 주소를 사용해 주세요.' : ''}
      </span>

      {/* Prev */}
      <button
        onClick={onPrev}
        // Phones: down in the caption row, not across the middle of the
        // photo — a full-width picture had a dark disc on each side of it.
        className={`absolute left-3 bottom-4 md:bottom-auto md:left-5 md:top-1/2 md:-translate-y-1/2 ${CONTROL}`}
        aria-label="이전 사진"
      >
        &lsaquo;
      </button>

      {/* Image — sized to the viewport, not to a box inset within it.
          The wrapper is a flex item with no width of its own, so it shrinks to
          exactly the rendered photo: everything around it is still backdrop,
          which is what makes "tap outside to close" meaningful now that the
          photo reaches the edges. The wrapper is also how the pointer handler
          above tells photo from backdrop, since the <img> itself never
          receives events (globals.css turns them off site-wide to blunt
          right-click saves). */}
      <motion.div
        ref={mediaRef}
        className="relative flex max-h-[100dvh] max-w-[100vw]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Image
          src={cloudinary(photo.src, { watermark: true, width: 2400 })}
          alt={label}
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
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-16 md:px-6 pb-6 pt-16 text-center
                   bg-gradient-to-t from-forest-black/85 via-forest-black/45 to-transparent"
      >
        {caption.title && (
          <p className="text-white text-sm font-serif font-medium tracking-tight">{caption.title}</p>
        )}
        <p className={`eyebrow text-white/70 ${caption.title ? 'mt-1.5' : ''}`}>
          {joinCaption([...caption.meta, `${currentIndex + 1} / ${photos.length}`])}
        </p>
        {/* 촬영 정보. 캡션보다 한 단계 더 조용하게 — 대문자 자간 없는 mono,
            더 낮은 불투명도. 값이 하나도 없으면 줄을 그리지 않는다. */}
        {exif.length > 0 && (
          <p className="mt-1.5 font-mono text-[11px] leading-snug tracking-normal text-white/50">
            {joinCaption(exif)}
          </p>
        )}
        {/* 캡션 띠는 `pointer-events-none`이다(스와이프가 사진 위에서 끊기지
            않게). 링크만 다시 받는다. */}
        <a
          href={inquiryHref}
          className="pointer-events-auto mt-2.5 inline-block text-[13px] text-cream/80 underline decoration-cream/35 underline-offset-4 transition-colors hover:text-cream hover:decoration-moss"
        >
          이 사진으로 프린트 문의
        </a>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className={`absolute right-3 bottom-4 md:bottom-auto md:right-5 md:top-1/2 md:-translate-y-1/2 ${CONTROL}`}
        aria-label="다음 사진"
      >
        &rsaquo;
      </button>
    </motion.div>
  );
}
