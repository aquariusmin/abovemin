const CLOUD_NAME = 'dmljaqqzc';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: number | 'auto';
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  crop?: 'fill' | 'limit' | 'fit' | 'scale' | 'crop';
  gravity?: 'auto' | 'face' | 'center';
}

/**
 * Generate an optimized Cloudinary URL.
 * @param publicId - e.g. "phorage/archive/photo1" or a full legacy public_id
 * @param options  - transformation options
 */
export function cloudinaryUrl(publicId: string, options: CloudinaryOptions = {}): string {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    gravity,
  } = options;

  const transforms: string[] = [`f_${format}`, `q_${quality}`];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);
  if (gravity) transforms.push(`g_${gravity}`);

  return `${BASE_URL}/${transforms.join(',')}/${publicId}`;
}

/**
 * Next.js custom image loader for <Image> component.
 * Usage in next.config.ts:
 *   images: { loader: 'custom', loaderFile: './src/lib/cloudinaryLoader.ts' }
 *
 * Or use the `loader` prop directly on <Image>.
 */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // src can be a public_id like "phorage/archive/photo1"
  // or an absolute Cloudinary URL — handle both
  if (src.startsWith('http')) return src;
  return cloudinaryUrl(src, { width, quality: quality ?? 'auto' });
}

/**
 * Cloudinary 이미지 URL에 워터마크 추가
 * 우하단에 반투명 "phorage" 텍스트 오버레이
 */
export function withWatermark(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  const watermark = 'l_text:Arial_18_bold:phorage,o_40,co_white,g_south_east,x_20,y_20';
  return url.replace('/upload/', `/upload/${watermark}/`);
}
