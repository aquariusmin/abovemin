"use client";

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

/**
 * 도착하면 흐린 미리보기(`placeholderStyle`) 위로 서서히 드러나는 이미지.
 *
 * 그리드 타일용이다. 흐린 판에서 선명한 사진으로 한 프레임에 바뀌면 타일마다
 * 깜빡이는 것처럼 보여서, 불투명도만 짧게 넘긴다. 크기와 자리는 건드리지 않는다
 * — 레이아웃은 로드 전후가 같다.
 *
 * 로드가 하이드레이션보다 먼저 끝나도(캐시된 이미지) 안전하다: `next/image`가
 * 마운트 때 `complete`인 이미지에 대해 `onLoad`를 다시 불러 준다.
 *
 * 움직임 줄이기: 전역 규칙(globals.css)이 전환 시간을 0으로 만들고,
 * `motion-reduce:transition-none`이 한 번 더 막는다 — 사진은 도착하는 순간 보인다.
 */
export default function FadeImage({ alt, className = '', onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      className={`${className} transition-[opacity,transform] ease-out motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={event => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
