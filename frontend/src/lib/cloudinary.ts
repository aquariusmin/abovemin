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
