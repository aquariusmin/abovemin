/**
 * Cloudinary 이미지 URL에 워터마크 추가.
 * 우하단에 반투명 "phorage" 텍스트 오버레이.
 */
export function withWatermark(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  const watermark = 'l_text:Arial_18_bold:phorage,o_40,co_white,g_south_east,x_20,y_20';
  return url.replace('/upload/', `/upload/${watermark}/`);
}
