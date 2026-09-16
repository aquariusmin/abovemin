/**
 * Cloudinary 딜리버리 최적화 헬퍼.
 *
 * 원본(4000~6000px, 수 MB)을 그대로 내려주지 않도록 URL의 `/upload/` 뒤에
 * 변환 파라미터를 주입한다. Cloudinary가 아닌 URL(Unsplash/Supabase 등)은
 * 그대로 반환한다.
 *
 *  - f_auto      : 브라우저 지원에 따라 AVIF/WebP 자동 선택
 *  - q_auto      : 지각 품질 기반 자동 압축 (보통 40~70% 절감)
 *  - c_limit,w_N : 가로 상한. 원본이 더 작으면 확대하지 않음
 *  - dpr_auto    : 레티나 대응
 */

interface OptimizeOptions {
  /** 가로 픽셀 상한. 그리드 썸네일 vs 라이트박스 원본에 맞게 조절. */
  width?: number;
  /** 우하단 "phorage" 워터마크 오버레이 추가 여부. */
  watermark?: boolean;
}

const WATERMARK = 'l_text:Arial_18_bold:phorage,o_40,co_white,g_south_east,x_20,y_20';

/**
 * 진짜 Cloudinary 딜리버리 URL인지 **호스트로** 확인한다.
 *
 * `url.includes("res.cloudinary.com")` 같은 부분 문자열 검사를 쓰면 안 된다.
 * `https://169.254.169.254/latest/meta-data/?res.cloudinary.com/upload/` 처럼
 * 호스트가 아닌 쿼리스트링에 문자열만 끼워 넣어도 통과한다. 이 URL은 관리자가
 * 설정하는 값(`hero_image`)이고 `cloudinaryAspect()`가 **서버에서** 가져오므로,
 * 부분 문자열 검사로는 서버가 내부망 주소로 요청을 보내게 만들 수 있다(SSRF).
 * `next.config.ts`의 `images.remotePatterns`도 호스트를 고정하고 있으니 같은
 * 기준을 적용한다.
 */
function isCloudinaryUrl(url: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return protocol === 'https:' && hostname === 'res.cloudinary.com' && pathname.includes('/upload/');
  } catch {
    return false; // 상대 경로 등 URL로 파싱되지 않는 값
  }
}

/**
 * `next/image`가 실제로 로드할 수 있는 주소인지 확인한다. 목록은
 * `next.config.ts`의 `images.remotePatterns`와 **같이 움직여야 한다** — 한쪽만
 * 늘리면 통과했는데 렌더에서 터지거나, 그 반대가 된다.
 *
 * 저장 시점에 막는 이유: `next/image`는 허용되지 않은 호스트를 만나면 렌더
 * 도중 throw하고, 홈 히어로가 그 대상이라 잘못된 값 하나가 홈 전체를 error
 * 바운더리로 떨어뜨린다. 관리자만 쓰는 입력이라도 오타 한 번의 결과가 그렇다.
 */
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

  // 리사이즈/최적화를 먼저 적용한 뒤, 워터마크는 "체이닝된 별도 변환"으로 얹는다.
  // 원본이 25MP를 넘는 카메라 사진(예: 42MP)의 경우, 오버레이(l_text)를 같은
  // 변환에 묶으면 Cloudinary가 원본 전체를 디코딩하다 25MP 한도(무료 플랜)에
  // 걸려 400을 반환한다. 먼저 w_N으로 줄이면 오버레이는 작은 이미지에만 적용돼
  // 한도에 걸리지 않는다.
  //
  // 크롭(c_fill)은 의도적으로 제공하지 않는다. 히어로를 포함해 이 사이트의
  // 이미지는 잘라내지 않고 프레임 쪽이 사진에 맞추는 것이 원칙이다.
  const optimize = [`f_auto`, `q_auto`, `c_limit`, `w_${width}`, `dpr_auto`].join(',');
  const transform = watermark ? `${optimize}/${WATERMARK}` : optimize;

  return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * 이미지가 오기 전에 프레임 배경으로 까는 흐린 미리보기.
 *
 * 폭 32px에 품질을 낮추고 흐림을 세게 건 한 장이라 1KB 안팎이다. 프레임은
 * 저장된 비율로 이미 자리를 잡고 있으므로, 이 배경은 "빈 칸"을 "곧 올 사진의
 * 색"으로 바꾸는 일만 한다. 모양을 정하는 데는 관여하지 않는다.
 *
 * 워터마크를 싣지 않는 이유: 32px로 줄인 뒤 흐린 것이라 내려받을 가치가 없고,
 * 오버레이를 얹으면 그 글자까지 번져 얼룩이 된다. Cloudinary가 아니면 null —
 * 부르는 쪽은 배경 없이(bg 토큰만) 둔다.
 */
export function cloudinaryPlaceholder(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;
  return withTransform(url, 'w_32,q_auto:low,e_blur:400,f_auto');
}

/**
 * 저장된 주소에 이미 붙어 있는 변환(`/upload/f_auto,q_auto/phorage/…` — 앨범
 * 커버와 옛 사진들이 그렇다)을 걷어 내고 `transform`만 남긴다.
 *
 * 체인은 **뒤의 것이 이긴다**. 걷어 내지 않으면 `…/q_auto:low,e_blur:400/f_auto,q_auto/`
 * 에서 저장된 `q_auto`가 미리보기의 `q_auto:low`를 되돌리고, 공유 카드의
 * `f_jpg`는 저장된 `f_auto`에 밀려 AVIF를 읽지 못하는 크롤러에게 WebP가 간다.
 * 저장된 변환은 전달 최적화뿐이라 걷어도 사진은 같다. 버전과 경로는 그대로 둔다.
 */
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

/** Open Graph 카드 크기. 페이스북·카카오톡·슬랙이 모두 1.91:1로 자른다. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * 사진 한 장의 공유 카드(1200×630).
 *
 * 카드 규격은 1.91:1로 고정인데 사진은 세로도 파노라마도 있다. `c_fill`로 채우면
 * 세로 사진은 가운데 띠만 남는다 — "프레임이 사진에 맞춘다"는 원칙(DESIGN.md
 * § Image Treatment)이 링크 미리보기에서 깨진다. 그래서 **자르지 않고 채운다**:
 * `c_pad`는 사진 전체를 카드 안에 넣고 남는 자리를 배경색으로 칠한다. 배경은
 * 페이지 바탕(`--background`, #fcfaf4)이라, 여백이 "잘못 채운 띠"가 아니라
 * 사이트의 종이 위에 사진을 올려 둔 모양으로 읽힌다.
 *
 * 체인 순서가 요구사항이다: 먼저 카드 안에 들어가게 줄이고(`c_limit`), 그
 * 작은 이미지에 워터마크를 얹고, 마지막에 여백을 붙인다. 여백을 먼저 붙이면
 * 워터마크가 사진이 아니라 크림색 여백 위에 앉아(흰 글자) 보이지 않고, 원본에
 * 바로 오버레이를 얹으면 25MP 한도에 걸린다(`cloudinary()`의 주석).
 *
 * `f_jpg`: 카드를 긁어 가는 크롤러 상당수가 AVIF/WebP를 읽지 못한다.
 */
export function cloudinaryOgImage(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;
  const fit = `c_limit,w_${OG_WIDTH},h_${OG_HEIGHT}`;
  const pad = `c_pad,w_${OG_WIDTH},h_${OG_HEIGHT},b_rgb:fcfaf4,f_jpg,q_auto`;
  return withTransform(url, `${fit}/${WATERMARK}/${pad}`);
}

/** 비율을 못 읽었을 때 쓰는 프레임 기본값 (3:2). */
export const DEFAULT_ASPECT = 1.5;

/**
 * 배포되는 이미지의 가로/세로 비율. 프레임을 사진에 맞추기 위해 **서버에서만**
 * 호출한다.
 *
 * `fl_getinfo`는 이미지 대신 JSON 메타데이터를 반환하는 플래그다. 변환 체인
 * *뒤에* 붙이면 `output`이 실제로 내려가는 크기를 알려주므로, EXIF 회전이나
 * c_limit 축소가 이미 반영된 값을 얻는다 (원본 `input`이 아니라 이쪽을 쓰는
 * 이유).
 *
 * 비율을 알면 프레임을 사진과 같은 모양으로 만들 수 있고, 그래야 잘라내지도
 * 남는 띠를 채우지도 않는다. Cloudinary가 아니거나 조회에 실패하면 null을
 * 반환하고, 호출부는 `DEFAULT_ASPECT`로 폴백한다.
 */
export async function cloudinaryAspect(url: string): Promise<number | null> {
  // 서버가 직접 요청을 보내는 유일한 지점이라, 호스트 검증이 특히 중요하다.
  if (!isCloudinaryUrl(url)) return null;

  try {
    // 페이지 revalidate(60초)보다 훨씬 길게 캐시한다. 같은 URL의 비율은
    // 바뀌지 않으므로, 히어로 이미지를 교체할 때만 새로 조회되면 된다.
    // 변환 컴포넌트 바로 뒤, 버전 앞에 붙여야 체인으로 인식된다.
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

/**
 * 워터마크 + 최적화. 기존 호출부 호환용 래퍼.
 * @deprecated 대신 `cloudinary(url, { watermark: true, width })`를 사용하세요.
 */
export function withWatermark(url: string, width = 1600): string {
  return cloudinary(url, { watermark: true, width });
}

/**
 * Cloudinary 변환 컴포넌트의 키.
 *
 * 목록으로 두는 이유: 변환 세그먼트(`f_auto,q_auto`)와 밑줄이 들어간 폴더
 * 이름(`my_folder`)은 모양만으로 구분되지 않는다. "1~3글자 + 밑줄"로 판정하면
 * 폴더를 변환으로 오해해 잘라낸다. Cloudinary가 자기 키를 알고 있는 것처럼,
 * 여기서도 아는 키만 자른다.
 */
const TRANSFORM_KEYS = new Set([
  'a', 'ar', 'b', 'bo', 'c', 'co', 'cs', 'd', 'dl', 'dn', 'dpr', 'du', 'e',
  'eo', 'f', 'fl', 'fn', 'g', 'h', 'if', 'ki', 'l', 'o', 'p', 'pg', 'q', 'r',
  'so', 't', 'u', 'vc', 'w', 'x', 'y', 'z',
]);

/** 이 경로 세그먼트가 변환 체인의 한 컴포넌트인가. */
function isTransformSegment(segment: string): boolean {
  const parts = segment.split(',');
  return parts.every(part => {
    const key = part.split('_')[0].split(':')[0];
    return part.includes('_') && TRANSFORM_KEYS.has(key);
  });
}

/**
 * 딜리버리 URL에서 Cloudinary의 `public_id`를 꺼낸다.
 *
 * 같은 파일이라도 변환 파라미터가 붙으면 URL이 달라지므로, "이 자산이 아직
 * 쓰이는가"를 URL 문자열로 비교할 수 없다. public_id가 그 질문의 유일한
 * 안정적인 열쇠다.
 *
 * 형태: `/<cloud>/image/upload[/<변환들>][/v<버전>]/<폴더>/<이름>.<확장자>`
 *
 * **버전 세그먼트가 없는 URL이 실제로 있다.** 앨범 커버가 그렇다:
 * `/upload/f_auto,q_auto/phorage/archive/photo_17.jpg`. 버전만 찾아 자르는
 * 방식은 여기서 `f_auto,q_auto/phorage/archive/photo_17`을 내놓았고, 그래서
 * 쓰이고 있는 커버가 "미사용 자산"으로 잡혔다 — 그 목록을 믿고 지웠으면
 * 앨범 표지가 사라졌을 것이다. 변환은 변환대로 걷어낸다.
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const marker = '/upload/';
    const at = pathname.indexOf(marker);
    if (at === -1) return null;

    let segments = pathname.slice(at + marker.length).split('/').filter(Boolean);
    // 앞쪽의 변환 체인을 걷어낸다.
    while (segments.length > 1 && isTransformSegment(segments[0])) segments = segments.slice(1);
    // 그 다음이 버전이면 그것도 건너뛴다.
    if (segments.length > 1 && /^v\d+$/.test(segments[0])) segments = segments.slice(1);

    return decodeURIComponent(segments.join('/')).replace(/\.[^./]+$/, '') || null;
  } catch {
    return null;
  }
}
