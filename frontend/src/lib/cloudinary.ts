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

export function cloudinary(url: string, { width = 1600, watermark = false }: OptimizeOptions = {}): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;

  const parts = [`f_auto`, `q_auto`, `c_limit`, `w_${width}`, `dpr_auto`];
  if (watermark) parts.push(WATERMARK);

  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

/**
 * 워터마크 + 최적화. 기존 호출부 호환용 래퍼.
 * @deprecated 대신 `cloudinary(url, { watermark: true, width })`를 사용하세요.
 */
export function withWatermark(url: string, width = 1600): string {
  return cloudinary(url, { watermark: true, width });
}
