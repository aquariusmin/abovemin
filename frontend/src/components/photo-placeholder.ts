import type { CSSProperties } from 'react';
import { cloudinaryPlaceholder } from '@/lib/cloudinary';

/**
 * 사진 프레임의 로딩 중 배경: 흐린 32px 미리보기를 프레임 전체에 깐다.
 *
 * 이미지가 아니라 **프레임**의 배경인 이유: 프레임은 저장된 비율로 이미 자리를
 * 잡고 있고(레이아웃 이동 없음), 사진이 도착하면 같은 상자를 덮는다. 그래서
 * 로드 뒤에 흐린 판을 치우는 코드가 필요 없고, 사진과 판이 어긋나 두 장이
 * 겹쳐 보일 틈도 없다 — 프레임 크기는 사진(`h-auto` + `aspect-ratio: auto w/h`)이
 * 정하므로, 실제 비율이 저장값과 달라도 판은 사진 뒤에 정확히 가려진다.
 *
 * `cover`: 미리보기 자체가 같은 사진의 같은 비율이라 잘리는 것이 없다.
 * 서버·클라이언트 어디서나 쓸 수 있도록 훅이 없는 순수 함수로 둔다.
 */
export function placeholderStyle(src: string): CSSProperties | undefined {
  const preview = cloudinaryPlaceholder(src);
  if (!preview) return undefined;
  return {
    // JSON.stringify: 따옴표로 감싸고 이스케이프까지 — URL의 쉼표·콜론이 CSS를 깨지 않게.
    backgroundImage: `url(${JSON.stringify(preview)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/**
 * 저장된 크기로 이미지의 비율을 미리 잡는 스타일. 크기는 비율로만 쓴다(원본이
 * 1500px 안팎으로 줄어 있다). `auto`가 앞에 있어 이미지가 도착하면 실제 비율이 이긴다.
 */
export function storedRatioStyle(photo: { width?: number | null; height?: number | null }): CSSProperties | undefined {
  return photo.width && photo.height ? { aspectRatio: `auto ${photo.width} / ${photo.height}` } : undefined;
}
