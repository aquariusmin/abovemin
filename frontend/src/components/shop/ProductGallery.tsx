"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import Image from 'next/image';
import { cloudinary } from '@/lib/cloudinary';

export interface GalleryImage {
  url: string;
  label: string | null;
  /** 배포되는 이미지의 가로÷세로. 서버가 `cloudinaryAspect`로 읽는다. 못 읽었으면 null. */
  aspect: number | null;
}

/** 스와이프로 인정하는 가로 이동(px). 세로 스크롤을 스와이프로 오해하지 않게. */
const SWIPE_THRESHOLD = 48;

/**
 * 상품 상세의 사진들 — 큰 사진 한 장과 그 아래 썸네일 줄.
 *
 * **프레임이 사진을 따른다**(DESIGN.md § Image Treatment). 포스터의 앞면은
 * 세로, 사용 예는 가로일 수 있다. 정사각 프레임에 `object-cover`로 넣으면 둘 중
 * 하나는 잘리고, `contain`으로 넣으면 남는 띠를 채워야 한다. 그래서 비율을
 * 아는 사진은 그 비율의 상자를 만들고(이미지보다 먼저 자리를 잡아 레이아웃이
 * 흔들리지 않는다), 모르는 사진은 이미지 자신의 크기로 그린다. 세로가 긴 사진은
 * 화면 높이를 넘지 않도록 폭이 줄어든다 — 자르는 대신.
 *
 * 썸네일도 같은 규칙: 높이만 맞추고 폭은 사진 비율대로.
 *
 * 키보드: 썸네일은 버튼이라 Tab으로 닿고, 줄 안에서는 ←/→/Home/End로 옮겨
 * 다닌다(누르는 즉시 큰 사진이 바뀐다). 휴대폰에서는 큰 사진을 좌우로 밀어도
 * 넘어간다.
 */
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
    // 가로로 충분히, 그리고 세로보다 더 많이 움직였을 때만.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? index + 1 : index - 1);
  }

  const ratio = current.aspect;

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
            // 비율을 아는 사진: 상자 = 사진. 폭은 칸을 넘지 않고, 높이는 화면의
            // 78%를 넘지 않도록 `ratio × 78svh`로 묶는다.
            <div
              className="relative overflow-hidden rounded-lg border border-border-light bg-stone"
              style={{ aspectRatio: ratio, width: `min(100%, calc(${ratio} * 78svh))` }}
            >
              <Image
                key={current.url}
                src={cloudinary(current.url, { width: 1600 })}
                alt={alt(current, index)}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-contain"
                /* 첫 사진이 이 페이지의 LCP다. 다른 장으로 넘긴 뒤에는
                   preload할 이유가 없다. */
                preload={index === 0}
              />
            </div>
          ) : (
            <Image
              key={current.url}
              src={cloudinary(current.url, { width: 1600 })}
              alt={alt(current, index)}
              width={0}
              height={0}
              sizes="(max-width: 768px) 100vw, 58vw"
              className="h-auto w-auto max-w-full max-h-[78svh] rounded-lg border border-border-light bg-stone"
              preload={index === 0}
            />
          )}
        </div>
        {(count > 1 || current.label) && (
          <figcaption className="flex items-baseline justify-center gap-3 text-[13px] text-muted-foreground" aria-live="polite">
            {count > 1 && (
              <span className="font-mono text-[11px] tabular-nums tracking-[0.12em]">
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
              // 현재 장만 Tab 순서에 두고 나머지는 방향키로 — 사진이 열 장이면
              // Tab 열 번을 지나야 "담기"에 닿는다.
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
                className="block h-16 w-auto bg-stone"
                style={image.aspect ? { aspectRatio: image.aspect } : undefined}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
