'use client';

import { cloudinaryResize } from '@/lib/cloudinary';

/**
 * `next/image` 전역 로더 (`next.config.ts`의 `images.loaderFile`).
 *
 * 기본 로더는 모든 원격 이미지를 `/_next/image`로 한 번 더 통과시킨다. 이
 * 사이트의 이미지는 이미 Cloudinary(`f_auto,q_auto,w_N`)나 Unsplash가 줄이고
 * 포맷을 고른 것이라, 그 위에서 다시 디코딩·인코딩하면 화질은 그대로이거나
 * 떨어지고 첫 요청이 느려지며 Vercel 이미지 최적화 사용량만 는다. 그래서 각
 * CDN에 `width`/`quality`를 직접 넘긴다.
 *
 *  - res.cloudinary.com   : 변환 체인의 폭·품질만 갈아 끼운다(워터마크는 유지).
 *  - images.unsplash.com  : Imgix 파라미터 `w`, `q`, `auto=format`.
 *  - 그 밖(로컬 `/public` 등): 줄여 줄 서버가 없으니 그대로 둔다.
 */
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
