interface OptimizeOptions {
  width?: number;
  watermark?: boolean;
}

// 순서 고정: 레이어 → 바탕 대비 12% 폭 → 불투명도 → 우하단. 자산은 관리 접두사 밖에 둔다(정리 대상 아님).
const WATERMARK = [
  'l_phorage:brand:signature',
  'c_scale,fl_relative,w_0.12',
  'o_60',
  'fl_layer_apply,g_south_east,x_0.025,y_0.03',
].join('/');

// 호스트는 `URL.hostname`으로 검사한다 — 부분 문자열 검사는 SSRF를 연다(`cloudinaryAspect`가 서버에서 요청).
function isCloudinaryUrl(url: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return protocol === 'https:' && hostname === 'res.cloudinary.com' && pathname.includes('/upload/');
  } catch {
    return false;
  }
}

// `next.config.ts`의 `images.remotePatterns`와 같이 움직여야 한다 — 허용 안 된 호스트는 렌더 중 throw.
export function isRenderableImageUrl(url: string): boolean {
  if (isCloudinaryUrl(url)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

export function cloudinary(url: string, { width = 1600, watermark = false }: OptimizeOptions = {}): string {
  if (!isCloudinaryUrl(url)) return url;

  // 먼저 줄이고 워터마크는 별도 체인으로 얹는다 — 원본에 오버레이하면 25MP 한도로 400. 크롭(c_fill)은 없다.
  const optimize = [`f_auto`, `q_auto`, `c_limit`, `w_${width}`, `dpr_auto`].join(',');
  const transform = watermark ? `${optimize}/${WATERMARK}` : optimize;

  return url.replace('/upload/', `/upload/${transform}/`);
}

const ALPHA_FORMATS = new Set(['png', 'webp', 'gif', 'avif']);

// 확장자로만 판단한다(렌더마다 픽셀을 읽지 않으려고).
export function mayHaveAlpha(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const ext = pathname.slice(pathname.lastIndexOf('.') + 1).toLowerCase();
    return ALPHA_FORMATS.has(ext);
  } catch {
    return false;
  }
}

// 워터마크를 싣지 않는다 — 흐림에 번져 얼룩이 된다.
export function cloudinaryPlaceholder(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;
  return withTransform(url, 'w_32,q_auto:low,e_blur:400,f_auto');
}

// 저장된 전달 변환을 걷어 낸다 — 체인은 뒤의 것이 이겨서 새 `q_`·`f_`를 되돌린다.
function withTransform(url: string, transform: string): string {
  const parsed = new URL(url);
  const marker = '/upload/';
  const at = parsed.pathname.indexOf(marker);
  const head = parsed.pathname.slice(0, at + marker.length);
  let segments = parsed.pathname.slice(at + marker.length).split('/');
  while (segments.length > 1 && isTransformSegment(segments[0])) segments = segments.slice(1);
  parsed.pathname = `${head}${transform}/${segments.join('/')}`;
  return parsed.toString();
}

const DELIVERY_KEYS = new Set(['f', 'q', 'w', 'dpr']);

function isDeliverySegment(segment: string): boolean {
  return segment.split(',').every(part => {
    const [key] = part.split('_');
    return DELIVERY_KEYS.has(key) || part === 'c_limit';
  });
}

// 전달 세그먼트만 갈아 맨 앞에 붙이고 워터마크 조각은 순서대로 남긴다(줄인 뒤 오버레이 — 25MP).
// 호출부의 `w_N`을 넘지 않는다. `dpr_auto`는 버린다 — srcset `w`와 겹치면 레티나에서 두 번 곱해진다.
export function cloudinaryResize(url: string, width: number, quality?: number): string {
  if (!isCloudinaryUrl(url)) return url;

  const parsed = new URL(url);
  const marker = '/upload/';
  const at = parsed.pathname.indexOf(marker);
  const head = parsed.pathname.slice(0, at + marker.length);
  let segments = parsed.pathname.slice(at + marker.length).split('/');

  let cap = Infinity;
  const kept: string[] = [];
  while (segments.length > 1 && isTransformSegment(segments[0])) {
    const segment = segments[0];
    segments = segments.slice(1);
    if (!isDeliverySegment(segment)) {
      kept.push(segment);
      continue;
    }
    const w = segment.split(',').find(part => /^w_\d+$/.test(part));
    if (w) cap = Math.min(cap, Number(w.slice(2)));
  }

  const w = Math.max(1, Math.round(Math.min(width, cap)));
  const q = quality ? `q_${quality}` : 'q_auto';
  const resize = ['f_auto', q, 'c_limit', `w_${w}`].join(',');
  parsed.pathname = `${head}${[resize, ...kept, ...segments].join('/')}`;
  return parsed.toString();
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// `c_pad`(자르지 않음), `c_fill` 금지. 순서: 줄이기 → 워터마크 → 여백(여백 먼저면 워터마크가 안 보인다).
// `f_jpg`: 크롤러 상당수가 AVIF/WebP를 읽지 못한다.
export function cloudinaryOgImage(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;
  const fit = `c_limit,w_${OG_WIDTH},h_${OG_HEIGHT}`;
  const pad = `c_pad,w_${OG_WIDTH},h_${OG_HEIGHT},b_rgb:fcfaf4,f_jpg,q_auto`;
  return withTransform(url, `${fit}/${WATERMARK}/${pad}`);
}

export const DEFAULT_ASPECT = 1.5;

// 서버 전용. `fl_getinfo`를 체인 뒤에 붙여야 `output`이 실제 전달 크기(EXIF 회전·축소 반영)다.
export async function cloudinaryAspect(url: string): Promise<number | null> {
  // 서버가 직접 요청을 보내는 유일한 지점이라, 호스트 검증이 특히 중요하다.
  if (!isCloudinaryUrl(url)) return null;

  try {
    // 변환 바로 뒤, 버전 앞에 붙여야 체인으로 인식된다.
    const res = await fetch(url.replace('/upload/', `/upload/c_limit,w_1600/fl_getinfo/`), {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const { output } = (await res.json()) as { output?: { width?: number; height?: number } };
    if (!output?.width || !output?.height) return null;

    return Number((output.width / output.height).toFixed(4));
  } catch {
    return null;
  }
}

/** @deprecated 대신 `cloudinary(url, { watermark: true, width })`를 사용하세요. */
export function withWatermark(url: string, width = 1600): string {
  return cloudinary(url, { watermark: true, width });
}

// 아는 키만 변환으로 본다 — 밑줄 든 폴더 이름(`my_folder`)을 변환으로 오해해 자르지 않게.
const TRANSFORM_KEYS = new Set([
  'a', 'ar', 'b', 'bo', 'c', 'co', 'cs', 'd', 'dl', 'dn', 'dpr', 'du', 'e',
  'eo', 'f', 'fl', 'fn', 'g', 'h', 'if', 'ki', 'l', 'o', 'p', 'pg', 'q', 'r',
  'so', 't', 'u', 'vc', 'w', 'x', 'y', 'z',
]);

function isTransformSegment(segment: string): boolean {
  const parts = segment.split(',');
  return parts.every(part => {
    const key = part.split('_')[0].split(':')[0];
    return part.includes('_') && TRANSFORM_KEYS.has(key);
  });
}

// 버전 세그먼트가 없는 URL도 있다(앨범 커버) — 변환은 변환대로 걷어 내야 쓰이는 자산을 미사용으로 잡지 않는다.
export function publicIdFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const marker = '/upload/';
    const at = pathname.indexOf(marker);
    if (at === -1) return null;

    let segments = pathname.slice(at + marker.length).split('/').filter(Boolean);
    while (segments.length > 1 && isTransformSegment(segments[0])) segments = segments.slice(1);
    if (segments.length > 1 && /^v\d+$/.test(segments[0])) segments = segments.slice(1);

    return decodeURIComponent(segments.join('/')).replace(/\.[^./]+$/, '') || null;
  } catch {
    return null;
  }
}
