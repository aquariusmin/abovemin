"use client";

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

/** `fadeIn={false}`: 첫 화면 타일용 — 불투명도 0은 하이드레이션 뒤에야 풀려 LCP가 밀린다. */
export default function FadeImage({
  alt,
  className = '',
  onLoad,
  fadeIn = true,
  ...props
}: ImageProps & { fadeIn?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const shown = loaded || !fadeIn;
  return (
    <Image
      {...props}
      alt={alt}
      className={`${className} transition-[opacity,transform] ease-out motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
      onLoad={event => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
