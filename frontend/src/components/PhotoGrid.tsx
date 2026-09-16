"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Lightbox from './Lightbox';
import { cloudinary } from '@/lib/cloudinary';
import { joinCaption, photoCaption, photoLabel } from '@/lib/caption';

const EASE = [0.22, 1, 0.36, 1] as const;

interface Photo {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
}

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const reduce = useReducedMotion();

  // 열린 사진이 URL에 있다.
  //
  // 45장짜리 앨범에서 한 장을 누군가에게 보여 주려면 "japan 앨범 열고 열두
  // 번째"라고 말하는 수밖에 없었다. `?p=<id>`면 주소 하나로 끝나고, 뒤로
  // 가기가 라이트박스를 닫는 동작이 된다 — 폰에서 사람들이 실제로 하는 동작.
  //
  // 인덱스가 아니라 **사진 id**를 쓴다. 인덱스는 앨범에 사진이 추가되거나
  // 순서가 바뀌면 다른 사진을 가리키게 되어, 공유한 링크가 조용히 틀려진다.
  //
  // `useSearchParams`가 아니라 히스토리 API를 직접 쓰는 이유: 그 훅은 Suspense
  // 경계를 요구하고, 그러면 이 앨범 페이지가 정적 프리렌더를 잃는다. 사진
  // 목록은 이 사이트의 본문이라 HTML에 들어 있어야 한다. 라이트박스는 어차피
  // 클라이언트 전용 장치이므로, 쿼리 문자열도 클라이언트에서만 다룬다.
  const [openId, setOpenId] = useState<string | null>(null);

  const lightboxIndex = useMemo(() => {
    if (openId === null) return null;
    const at = photos.findIndex(photo => String(photo.id) === openId);
    return at === -1 ? null : at;
  }, [openId, photos]);

  // 주소창을 상태의 원천으로 삼는다: 첫 진입에서 한 번 읽고, 그 뒤로는
  // 뒤로/앞으로 가기를 따라간다.
  useEffect(() => {
    const read = () => setOpenId(new URLSearchParams(window.location.search).get('p'));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  // 공유받은 링크로 바로 들어왔다면, 닫았을 때 그 사진이 화면에 있도록
  // 뒤의 그리드를 미리 그 자리로 옮겨 둔다.
  useEffect(() => {
    if (openId === null) return;
    document.getElementById(`photo-${openId}`)?.scrollIntoView({ block: 'center' });
    // 열리는 순간 한 번이면 된다. 넘길 때마다 스크롤하면 닫았을 때 처음 보던
    // 자리를 잃는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId === null]);

  const setQuery = useCallback((id: string | null, mode: 'push' | 'replace') => {
    const params = new URLSearchParams(window.location.search);
    if (id === null) params.delete('p');
    else params.set('p', id);
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    // 여는 것만 히스토리에 쌓는다. 스무 장을 넘긴 뒤 뒤로 가기를 스무 번
    // 눌러야 앨범으로 돌아가는 것은 함정이다.
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    setOpenId(id);
  }, []);

  const open = useCallback((index: number) => setQuery(String(photos[index].id), 'push'), [photos, setQuery]);
  const close = useCallback(() => setQuery(null, 'replace'), [setQuery]);
  const step = useCallback(
    (delta: number) => {
      if (lightboxIndex === null) return;
      const next = (lightboxIndex + delta + photos.length) % photos.length;
      setQuery(String(photos[next].id), 'replace');
    },
    [lightboxIndex, photos, setQuery],
  );

  if (photos.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto border border-hairline rounded-lg py-20 md:py-28 px-6 text-center">
        <p className="eyebrow text-muted-foreground">No pieces yet</p>
        <p className="mt-3 text-base text-slate break-keep">
          이 컬렉션에는 아직 공개된 사진이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 max-w-[1400px] mx-auto [&>button]:mb-4 md:[&>button]:mb-6">
        {photos.map((photo, i) => {
          // "-"·빈 값·제목과 같은 장소는 여기서 빠진다 — 규칙은 `lib/caption`.
          const caption = photoCaption(photo);
          const label = photoLabel(photo);
          return (
          <motion.button
            key={photo.id}
            type="button"
            id={`photo-${photo.id}`}
            className="break-inside-avoid group block w-full text-left cursor-pointer"
            onClick={() => open(i)}
            aria-label={`${label} 크게 보기`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="relative overflow-hidden rounded-md bg-stone">
              {/* Next 16 deprecates `priority` in favour of `preload`, but a
                  preload link is the wrong migration for a masonry grid: the
                  column count changes with the viewport, so which tile is the
                  LCP element is not knowable from the markup — the docs name
                  this case explicitly and point at these two props instead.
                  Same treatment the Lightbox already uses. */}
              <Image
                src={cloudinary(photo.src, { watermark: true, width: 800 })}
                alt={label}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
            </div>
            {(caption.title || caption.meta.length > 0) && (
              <div className="mt-3">
                {caption.title && (
                  <p className="text-[13px] font-medium text-ink-body group-hover:text-accent transition-colors">
                    {caption.title}
                  </p>
                )}
                {caption.meta.length > 0 && (
                  <p className={`eyebrow text-muted-foreground ${caption.title ? 'mt-1' : ''}`}>
                    {joinCaption(caption.meta)}
                  </p>
                )}
              </div>
            )}
          </motion.button>
          );
        })}
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
