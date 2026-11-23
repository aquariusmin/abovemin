"use client";

import { useEffect, useCallback, useLayoutEffect, useRef, useState } from 'react';
import Image, { getImageProps } from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { cloudinary } from '@/lib/cloudinary';
import { exifParts, joinCaption, photoCaption, photoLabel } from '@/lib/caption';
import { photoShareUrl, printInquiryMailto } from '@/lib/photo-share';
import { copyToClipboard } from '@/lib/clipboard';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import { displayFace } from '@/lib/typography';

const EASE = [0.22, 1, 0.36, 1] as const;

// Each control carries its own dark disc: a bare white glyph vanishes over a bright sky.
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

function lightboxSrc(photo: Photo): string {
  return cloudinary(photo.src, { watermark: true, width: 2400 });
}

/** 프레임 폭 `min(100vw, 100vh × 비율)`에서 나온 `sizes`. 저장된 크기로만 계산해 미리 받은 이웃과 맞춘다. */
function lightboxSizes(photo: Photo, learnedRatio?: number): string {
  if (!photo.width || !photo.height) return '100vw';
  const stored = photo.width / photo.height;
  const ratio = learnedRatio && learnedRatio > stored * 1.01 ? learnedRatio : stored;
  const vh = Math.ceil(ratio * 10000) / 100;
  return `(min-aspect-ratio: ${Math.round(ratio * 1000)}/1000) ${vh}vh, 100vw`;
}

export default function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }: LightboxProps) {
  const photo = photos[currentIndex];
  const caption = photoCaption(photo);
  const label = photoLabel(photo);
  const exif = exifParts(photo);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copyLink = useCallback(async () => {
    const url = photoShareUrl(photo, window.location.origin, window.location.href);
    const ok = await copyToClipboard(url);
    setCopyState(ok ? 'copied' : 'failed');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2000);
  }, [photo]);

  const inquiryHref = printInquiryMailto(
    CONTACT_EMAIL,
    photo,
    typeof window === 'undefined'
      ? photoShareUrl(photo, SITE_URL, SITE_URL)
      : photoShareUrl(photo, window.location.origin, window.location.href),
  );

  // Keyed by photo id: one <img> is reused across the album, so a single value mis-sizes on Next/Prev.
  const [ratios, setRatios] = useState<Record<number, number>>({});
  // 저장된 크기는 비율만 쓴다(원본이 1500px 안팎). 실제로 읽은 비율이 오면 그쪽이 이긴다.
  const storedRatio = photo.width && photo.height ? photo.width / photo.height : undefined;
  const ratio = ratios[photo.id] ?? storedRatio;

  const [loadedId, setLoadedId] = useState<number | null>(null);

  const rememberRatio = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, dataset } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    // `onLoad` also fires for placeholder passes; pin to the id the element is actually showing.
    const id = Number(dataset.photoId);
    if (!Number.isFinite(id)) return;
    setRatios(prev => (prev[id] ? prev : { ...prev, [id]: naturalWidth / naturalHeight }));
    setLoadedId(id);
  }, []);

  // 이웃은 지금 사진이 다 온 뒤에 같은 srcset·sizes로 받는다(대역폭 경쟁 방지). 데이터 절약 모드는 제외.
  const preloaded = useRef(new Set<number>());
  const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length];
  const nextPhoto = photos[(currentIndex + 1) % photos.length];
  useEffect(() => {
    if (loadedId !== photo.id) return;
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (connection?.saveData) return;
    for (const neighbour of [nextPhoto, prevPhoto]) {
      if (neighbour.id === photo.id || preloaded.current.has(neighbour.id)) continue;
      preloaded.current.add(neighbour.id);
      const { props } = getImageProps({
        src: lightboxSrc(neighbour),
        alt: '',
        width: 0,
        height: 0,
        sizes: lightboxSizes(neighbour, ratios[neighbour.id]),
      });
      const image = new window.Image();
      image.fetchPriority = 'low';
      image.decoding = 'async';
      // `sizes` → `srcset` → `src` 순서. 뒤집으면 `src`만 보고 한 번 더 받는다.
      if (props.sizes) image.sizes = props.sizes;
      if (props.srcSet) image.srcset = props.srcSet;
      image.src = props.src;
    }
  }, [loadedId, photo.id, nextPhoto, prevPhoto, ratios]);

  // `useLayoutEffect`: 노드가 빠지기 전에 `close()`해야 연 타일로 포커스가 돌아간다.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // 닫기 요청(`cancel`)은 막고 `onClose`로 넘긴다 — 닫기는 URL이 정한다. 곧장 온 `close`도 한 번만.
  const closing = useRef(false);
  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  }, [onClose]);
  const onCancel = useCallback((e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    requestClose();
  }, [requestClose]);

  // Safari가 `dialog:modal` 스크롤 잠금을 아직 따르지 않아 휠만 직접 막는다(React onWheel은 passive).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    dialog.addEventListener('wheel', stop, { passive: false });
    return () => dialog.removeEventListener('wheel', stop);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { onPrev(); return; }
    if (e.key === 'ArrowRight') { onNext(); return; }
  }, [onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // The dialog owns the gesture (<img> has pointer-events: none); no onClick close, a drag ends in a click.
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

  /** Shared by pointerup and pointercancel: a swipe often ends in a cancel with zeroed coordinates. */
  const finishPress = useCallback(
    (dx: number, dy: number, onPhoto: boolean, cancelled: boolean) => {
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onNext();
        else onPrev();
        return;
      }
      if (cancelled) return;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !onPhoto) requestClose();
    },
    [requestClose, onNext, onPrev],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
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
      finishPress(e.clientX - start.x, e.clientY - start.y, start.onPhoto, false);
    },
    [finishPress],
  );

  const onPointerCancel = useCallback(() => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    finishPress(start.lastX - start.x, start.lastY - start.y, start.onPhoto, true);
  }, [finishPress]);

  return (
    <motion.dialog
      ref={dialogRef}
      // `touch-none`: nothing scrolls here and vertical pans chained to the page. `open:flex` keeps closed hidden.
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 p-0 bg-forest-black md:bg-forest-black/95 backdrop:bg-transparent open:flex items-center justify-center touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onCancel={onCancel}
      onClose={requestClose}
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {/* First in the dialog, so `showModal()` puts focus here on open. */}
      <button
        type="button"
        onClick={requestClose}
        className={`absolute top-3 right-3 md:top-5 md:right-5 ${CONTROL}`}
        aria-label="닫기"
      >
        &times;
      </button>

      {/* The label changes to the result, and the live region says it aloud. */}
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

      <button
        onClick={onPrev}
        className={`absolute left-3 bottom-4 md:bottom-auto md:left-5 md:top-1/2 md:-translate-y-1/2 ${CONTROL}`}
        aria-label="이전 사진"
      >
        &lsaquo;
      </button>

      {/* Wrapper shrinks to the photo: the pointer handler uses it to tell photo from backdrop. */}
      <motion.div
        ref={mediaRef}
        className="relative flex max-h-[100dvh] max-w-[100vw]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Image
          src={lightboxSrc(photo)}
          alt={label}
          width={0}
          height={0}
          sizes={lightboxSizes(photo, ratios[photo.id])}
          data-photo-id={photo.id}
          onLoad={rememberRatio}
          // Width is min(100vw, 100dvh × ratio) so both axes match the picture; `aspect-auto` stops 0/0.
          className="aspect-auto object-contain max-w-[100vw] max-h-[100dvh]"
          style={
            ratio
              ? { width: `min(100vw, calc(100dvh * ${ratio}))`, height: 'auto' }
              : { width: 'auto', height: 'auto' }
          }
          // Not `priority`: this mounts on click, so eager + high fetchPriority instead.
          loading="eager"
          fetchPriority="high"
          draggable={false}
        />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-16 md:px-6 pb-6 pt-16 text-center
                   bg-gradient-to-t from-forest-black/85 via-forest-black/45 to-transparent"
      >
        {caption.title && (
          <p className={`text-white text-base ${displayFace(caption.title)} font-medium tracking-tight`}>{caption.title}</p>
        )}
        <p className={`label-ko text-white/70 ${caption.title ? 'mt-1.5' : ''}`}>
          {joinCaption([...caption.meta, `${currentIndex + 1} / ${photos.length}`])}
        </p>
        {exif.length > 0 && (
          <p className="mt-1.5 font-mono text-xs leading-snug tracking-normal text-white/60">
            {joinCaption(exif)}
          </p>
        )}
        {/* 캡션 띠는 `pointer-events-none`(스와이프가 끊기지 않게). 링크만 다시 받는다. */}
        <a
          href={inquiryHref}
          className="pointer-events-auto mt-2.5 inline-block text-[13px] text-cream/80 underline decoration-cream/35 underline-offset-4 transition-colors hover:text-cream hover:decoration-moss"
        >
          이 사진 프린트 문의
        </a>
      </div>

      <button
        onClick={onNext}
        className={`absolute right-3 bottom-4 md:bottom-auto md:right-5 md:top-1/2 md:-translate-y-1/2 ${CONTROL}`}
        aria-label="다음 사진"
      >
        &rsaquo;
      </button>
    </motion.dialog>
  );
}
