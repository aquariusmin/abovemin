'use client';

import { cloudinaryResize } from '@/lib/cloudinary';

// `/_next/image`를 거치지 않는다 — Cloudinary/Unsplash에 폭·품질을 직접 넘긴다.
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src; // 상대 경로(`/public`의 파일)
  }

  if (url.protocol !== 'https:') return src;

  if (url.hostname === 'res.cloudinary.com') {
    return cloudinaryResize(src, width, quality);
  }

  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality || 75));
    url.searchParams.set('auto', 'format');
    return url.toString();
  }

  return src;
}
