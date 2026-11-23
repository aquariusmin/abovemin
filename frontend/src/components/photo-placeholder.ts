import type { CSSProperties } from 'react';
import { cloudinaryPlaceholder } from '@/lib/cloudinary';

/** 프레임의 배경이라 사진이 같은 상자를 덮는다. `cover`여도 미리보기가 같은 사진·같은 비율이라 잘리지 않는다. */
export function placeholderStyle(src: string): CSSProperties | undefined {
  const preview = cloudinaryPlaceholder(src);
  if (!preview) return undefined;
  return {
    // JSON.stringify: 따옴표로 감싸고 이스케이프까지 — URL의 쉼표·콜론이 CSS를 깨지 않게.
    backgroundImage: `url(${JSON.stringify(preview)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/** 크기는 비율로만 쓴다(원본이 1500px 안팎). `auto`가 앞에 있어 이미지가 도착하면 실제 비율이 이긴다. */
export function storedRatioStyle(photo: { width?: number | null; height?: number | null }): CSSProperties | undefined {
  return photo.width && photo.height ? { aspectRatio: `auto ${photo.width} / ${photo.height}` } : undefined;
}
