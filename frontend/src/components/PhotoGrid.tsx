"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FadeImage from './FadeImage';
import { placeholderStyle } from './photo-placeholder';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { revealTarget, useBelowFoldReveal } from './motion/useBelowFoldReveal';
import Lightbox from './Lightbox';
import { cloudinary } from '@/lib/cloudinary';
import { featureIndices } from '@/lib/layout-photos';
import { joinCaption, photoCaption, photoLabel } from '@/lib/caption';

const EASE = [0.22, 1, 0.36, 1] as const;

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

/** `eagerFirst`: 첫 칸이 LCP인 앨범 페이지에서만. /archive에서는 꺼야 진짜 LCP인 표지와 대역폭을 다투지 않는다. */
export default function PhotoGrid({
  photos,
  eagerFirst = true,
  feature = false,
}: {
  photos: Photo[];
  eagerFirst?: boolean;
  feature?: boolean;
}) {
  // 열린 사진은 `?p=<id>`(인덱스 아님). `useSearchParams`는 Suspense를 요구해 정적 프리렌더를 잃으므로 히스토리 API.
  const [openId, setOpenId] = useState<string | null>(null);
  const pushed = useRef(false);

  const lightboxIndex = useMemo(() => {
    if (openId === null) return null;
    const at = photos.findIndex(photo => String(photo.id) === openId);
    return at === -1 ? null : at;
  }, [openId, photos]);

  useEffect(() => {
    const read = () => setOpenId(new URLSearchParams(window.location.search).get('p'));
    const onPop = () => {
      pushed.current = false;
      read();
    };
    read();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (openId === null) return;
    document.getElementById(`photo-${openId}`)?.scrollIntoView({ block: 'center' });
    // 열리는 순간 한 번만 스크롤한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId === null]);

  const setQuery = useCallback((id: string | null, mode: 'push' | 'replace') => {
    const params = new URLSearchParams(window.location.search);
    if (id === null) params.delete('p');
    else params.set('p', id);
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    // 여는 것만 히스토리에 쌓는다 — 넘길 때마다 쌓으면 뒤로 가기가 함정이 된다.
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    setOpenId(id);
  }, []);

  const open = useCallback((index: number) => {
    setQuery(String(photos[index].id), 'push');
    pushed.current = true;
  }, [photos, setQuery]);
  // 우리가 연 것이면 닫기는 그 한 칸을 되돌린다(뒤로가기 헛걸음 방지). 공유 링크로 왔으면 `?p=`만 지운다.
  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    setQuery(null, 'replace');
  }, [setQuery]);
  const step = useCallback(
    (delta: number) => {
      if (lightboxIndex === null) return;
      const next = (lightboxIndex + delta + photos.length) % photos.length;
      setQuery(String(photos[next].id), 'replace');
    },
    [lightboxIndex, photos, setQuery],
  );

  const featured = feature ? featureIndices(photos) : null;

  if (photos.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto border border-hairline rounded-lg py-20 md:py-28 px-6 text-center">
        <p className="eyebrow text-muted-foreground">No pieces yet</p>
        <p className="mt-3 text-base text-slate break-keep">
          이 앨범에는 아직 공개된 사진이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 max-w-[1400px] mx-auto [&>button]:mb-4 md:[&>button]:mb-6">
        {photos.map((photo, i) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={i}
            onOpen={open}
            eager={eagerFirst && i === 0}
            featured={featured?.has(i) ?? false}
          />
        ))}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            key="lightbox"
            photos={photos}
            currentIndex={lightboxIndex}
            onClose={close}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** 등장 애니메이션은 마운트 때 뷰포트 아래에 있던 타일에만 — 서버 HTML에서는 모두 보인다. */
function PhotoTile({
  photo,
  index,
  onOpen,
  eager,
  featured,
}: {
  photo: Photo;
  index: number;
  onOpen: (index: number) => void;
  eager: boolean;
  featured: boolean;
}) {
  const reduce = useReducedMotion();
  const { ref, deferred, hidden } = useBelowFoldReveal<HTMLButtonElement>();
  const caption = photoCaption(photo);
  const label = photoLabel(photo);
  const hasCaption = Boolean(caption.title || caption.meta.length > 0);
  // 보이는 캡션 그대로를 이름으로 `aria-labelledby`(WCAG 2.5.3). 캡션이 없는 사진만 `aria-label`.
  const captionId = `photo-${photo.id}-caption`;
  const actionId = `photo-${photo.id}-action`;
  return (
    <motion.button
      ref={ref}
      type="button"
      id={`photo-${photo.id}`}
      className={`break-inside-avoid group block w-full text-left cursor-pointer ${featured ? '[column-span:all] sm:my-6 md:my-10' : ''}`}
      onClick={() => onOpen(index)}
      aria-labelledby={hasCaption ? `${captionId} ${actionId}` : undefined}
      aria-label={hasCaption ? undefined : `${label} 크게 보기`}
      initial={false}
      animate={revealTarget(hidden, reduce)}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div
        className={featured ? 'mx-auto' : undefined}
        style={featured && photo.width && photo.height ? { width: `min(100%, calc(${(photo.width / photo.height).toFixed(4)} * 78svh))` } : undefined}
      >
      <div className="relative overflow-hidden rounded-md bg-stone" style={placeholderStyle(photo.src)}>
        {/* Not `preload`: the LCP tile depends on the column count, so `loading`/`fetchPriority` instead. */}
        <FadeImage
          src={cloudinary(photo.src, { watermark: true, width: featured ? 1600 : 800 })}
          alt={label}
          width={0}
          height={0}
          // `sizes`는 칸의 실제 폭: 컨테이너 1400px, 여백 20/24/40px, 열 간격 16px(md부터 24px)에서 계산.
          sizes={featured ? '(min-width: 640px) 75vw, calc(100vw - 40px)' : '(min-width: 1480px) 451px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, calc(100vw - 40px)'}
          className="w-full h-auto block duration-700 group-hover:scale-105"
          // 저장된 비율로 먼저 자리를 잡는다(밀림 방지). `auto`가 앞이라 도착한 실제 비율이 이긴다.
          style={photo.width && photo.height ? { aspectRatio: `auto ${photo.width} / ${photo.height}` } : undefined}
          draggable={false}
          fadeIn={deferred}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
        />
      </div>
      {hasCaption && (
        <div id={captionId} className="mt-3">
          {caption.title && (
            <p className="text-sm font-medium text-ink-body group-hover:text-accent transition-colors">
              {caption.title}
            </p>
          )}
          {caption.meta.length > 0 && (
            <p className={`label-ko text-muted-foreground ${caption.title ? 'mt-1' : ''}`}>
              {joinCaption(caption.meta)}
            </p>
          )}
        </div>
      )}
      </div>
      {hasCaption && <span id={actionId} className="sr-only">크게 보기</span>}
    </motion.button>
  );
}
