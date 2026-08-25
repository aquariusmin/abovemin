import { createHash } from 'crypto';

/**
 * Cloudinary 업로드 서명. **서버 전용** — `CLOUDINARY_API_SECRET`이 클라이언트
 * 번들에 들어가면 안 된다.
 *
 * 브라우저가 파일을 서버로 보내지 않고 Cloudinary에 **직접** 올린다. 서버는
 * 파라미터에 서명만 해 주므로 Vercel 함수의 요청 본문 크기 제한(4.5MB)에
 * 걸리지 않고, 원본 수십 MB짜리 사진도 그대로 올라간다.
 *
 * unsigned upload preset을 쓰지 않는 이유: preset 이름은 브라우저에 노출되고,
 * 그것만 알면 누구나 이 계정 용량을 소진시킬 수 있다. 서명은 관리자 세션이
 * 있어야만 발급된다.
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** 업로드된 사진이 들어갈 Cloudinary 폴더. 기존 자산도 `phorage/archive/` 아래에 있다. */
export function uploadFolder(albumSlug: string): string {
  return `phorage/archive/${albumSlug}`;
}

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

/**
 * Cloudinary 서명 규칙: `file`/`api_key`/`cloud_name`/`resource_type`을 제외한
 * 모든 파라미터를 키 기준 사전순으로 `k=v&k=v` 로 잇고, 뒤에 api_secret을 붙여
 * SHA-1 해시한다.
 *
 * 서명은 파일이 아니라 **파라미터**에만 의존하므로, 같은 앨범에 올리는 여러
 * 장이 서명 하나를 공유할 수 있다 (Cloudinary는 timestamp를 1시간까지 허용).
 */
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

/**
 * 저장하려는 URL이 **우리 계정의** Cloudinary 딜리버리 URL인지 확인한다.
 * 관리자만 호출하는 경로지만, `photos.src`는 사이트 전체에 그대로 렌더되는
 * 값이라 호스트와 cloud name을 둘 다 고정한다 (`next.config.ts`의
 * `images.remotePatterns`와 같은 기준).
 */
export function isOwnCloudinaryUrl(url: string, cloudName: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return (
      protocol === 'https:' &&
      hostname === 'res.cloudinary.com' &&
      pathname.startsWith(`/${cloudName}/`) &&
      pathname.includes('/upload/')
    );
  } catch {
    return false;
  }
}
