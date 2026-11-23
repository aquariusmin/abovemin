import { createHash } from 'crypto';

// 서버 전용 — `CLOUDINARY_API_SECRET`이 클라이언트 번들에 들어가면 안 된다. 서명은 관리자 세션에서만 발급.
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function uploadFolder(albumSlug: string): string {
  return `phorage/archive/${albumSlug}`;
}

// 아카이브와 분리: 미사용 원본 정리(`lib/admin/orphans.ts`)가 폴더 단위로 범위를 잡는다.
export const SHOP_UPLOAD_FOLDER = 'phorage/shop';

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName && 'CLOUDINARY_CLOUD_NAME',
      !apiKey && 'CLOUDINARY_API_KEY',
      !apiSecret && 'CLOUDINARY_API_SECRET',
    ].filter(Boolean);
    throw new Error(`Cloudinary upload configuration is missing: ${missing.join(', ')}`);
  }
  return { cloudName, apiKey, apiSecret };
}

// Cloudinary 서명: file/api_key/cloud_name/resource_type 제외, 키 사전순 `k=v&…` + secret의 SHA-1.
export function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

// `photos.src`는 사이트 전체에 렌더되므로 호스트와 cloud name을 둘 다 고정한다.
export function isOwnCloudinaryUrl(url: string, cloudName: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    // `/image/upload/` 접두사로 고정 — `includes('/upload/')`면 fetch형 URL로 남의 이미지를 프록시할 수 있다.
    return (
      protocol === 'https:' &&
      hostname === 'res.cloudinary.com' &&
      pathname.startsWith(`/${cloudName}/image/upload/`)
    );
  } catch {
    return false;
  }
}
