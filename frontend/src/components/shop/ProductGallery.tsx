"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import Image from 'next/image';
import { cloudinary, mayHaveAlpha } from '@/lib/cloudinary';

export interface GalleryImage {
  url: string;
  label: string | null;
  aspect: number | null;
}

/** 스와이프로 인정하는 가로 이동(px). 세로 스크롤을 스와이프로 오해하지 않게. */
const SWIPE_THRESHOLD = 48;

/** `sizes`: 사진 칸(`md:col-span-7`, `max-w-6xl`, 간격 48/64px)의 실제 폭. 비율을 알면 `비율 × 78vh`로 더 좁힌다. */
function mainSizes(ratio: number | null): string {
  const column = '(min-width: 1232px) 646px, (min-width: 768px) 53vw, calc(100vw - 40px)';
  if (!ratio) return column;
  const heightBound = Math.floor(645 / (0.78 * ratio));
  const width = Math.ceil(78 * ratio * 100) / 100;
  return `(min-width: 1232px) and (max-height: ${heightBound}px) ${width}vh, ${column}`;
}

/** 프레임이 사진을 따른다 — 자르지 않는다(DESIGN.md § Image Treatment). */
export default function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const count = images.length;
  const current = images[Math.min(index, count - 1)];
  if (!current) return null;

  const alt = (image: GalleryImage, i: number) =>
    image.label ? `${name} — ${image.label}` : count > 1 ? `${name} — ${i + 1}번째 사진` : name;

  function go(next: number, focus = false) {
    const wrapped = (next + count) % count;
    setIndex(wrapped);
    if (focus) thumbRefs.current[wrapped]?.focus();
  }

  function onThumbKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    go(keys[event.key], true);
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || count < 2) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? index + 1 : index - 1);
  }

  const ratio = current.aspect;
  const frame = mayHaveAlpha(current.url) ? '' : 'rounded-lg border border-border-light bg-stone';

  return (
    <div className="space-y-4">
      <figure className="space-y-3">
        <div
          className="flex justify-center"
          onTouchStart={count > 1 ? onTouchStart : undefined}
          onTouchEnd={count > 1 ? onTouchEnd : undefined}
          style={count > 1 ? { touchAction: 'pan-y' } : undefined}
        >
          {ratio ? (
            <div
              className={`relative overflow-hidden ${frame}`}
              style={{ aspectRatio: ratio, width: `min(100%, calc(${ratio} * 78svh))` }}
            >
              <Image
                key={current.url}
                src={cloudinary(current.url, { width: 1600 })}
                alt={alt(current, index)}
                fill
                sizes={mainSizes(ratio)}
                className="object-contain"
                /* 첫 사진만 preload한다 — 이 페이지의 LCP다. */
                preload={index === 0}
                fetchPriority={index === 0 ? 'high' : undefined}
              />
            </div>
          ) : (
            <Image
              key={current.url}
              src={cloudinary(current.url, { width: 1600 })}
              alt={alt(current, index)}
              width={0}
              height={0}
              sizes={mainSizes(null)}
              className={`h-auto w-auto max-w-full max-h-[78svh] ${frame}`}
              preload={index === 0}
              fetchPriority={index === 0 ? 'high' : undefined}
            />
          )}
        </div>
        {(count > 1 || current.label) && (
          <figcaption className="flex items-baseline justify-center gap-3 text-[13px] text-muted-foreground" aria-live="polite">
            {count > 1 && (
              <span className="font-mono text-xs tabular-nums tracking-[0.08em]">
                {index + 1} / {count}
              </span>
            )}
            {current.label && <span>{current.label}</span>}
          </figcaption>
        )}
      </figure>

      {count > 1 && (
        <div
          role="group"
          aria-label={`${name} 사진 ${count}장`}
          onKeyDown={onThumbKey}
          className="flex flex-wrap justify-center gap-2"
        >
          {images.map((image, i) => (
            <button
              key={image.url}
              ref={element => { thumbRefs.current[i] = element; }}
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? 'true' : undefined}
              aria-label={`${i + 1}번째 사진 보기${image.label ? ` — ${image.label}` : ''}`}
              // 현재 장만 Tab 순서에 두고 나머지는 방향키로 옮긴다.
              tabIndex={i === index ? 0 : -1}
              className={`overflow-hidden rounded-md border transition-[border-color,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                i === index ? 'border-primary opacity-100' : 'border-border-light opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={cloudinary(image.url, { width: 240 })}
                alt=""
                width={0}
                height={0}
                sizes="120px"
                className={`block h-16 w-auto ${mayHaveAlpha(image.url) ? '' : 'bg-stone'}`}
                style={image.aspect ? { aspectRatio: image.aspect } : undefined}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
