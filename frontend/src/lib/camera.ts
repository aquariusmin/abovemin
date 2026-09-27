import { cleanCaptionField, displayCamera } from './caption';

/**
 * 카메라로 보기. `/archive` 필터의 선택지와, 사진 페이지의 "카메라" 줄이 여는
 * 링크가 같은 규칙을 써야 한다 — 링크가 싣는 값이 선택지에 없으면 필터가
 * 조용히 "전체"로 남는다.
 *
 * 값은 DB에 저장된 이름 그대로("Apple iPhone 15 Pro Max")이고, 보이는 이름만
 * `displayCamera`로 줄인다. 줄인 이름을 값으로 쓰면 제조사가 다른 같은 모델명이
 * 한 칸으로 합쳐질 수 있다.
 */

export interface CameraOption {
  value: string;
  label: string;
  count: number;
}

/** 필터 선택지: 사진이 많은 카메라가 위, 같으면 이름순. 카메라가 없는 사진은 세지 않는다. */
export function cameraOptions(photos: ReadonlyArray<{ camera?: string | null }>): CameraOption[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    const value = cleanCaptionField(photo.camera);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: displayCamera(value) ?? value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function matchesCamera(photo: { camera?: string | null }, camera: string): boolean {
  return cleanCaptionField(photo.camera) === camera;
}

/** `/archive`의 쿼리 이름. 필터가 첫 진입에 읽는다(`PhotoFilter`). */
export const CAMERA_PARAM = 'camera';

/**
 * 사진 페이지 → 그 카메라로 걸러 둔 `/archive`. `#archive-search`는 필터 섹션의
 * 제목이라, 앨범 그리드를 지나 바로 결과 위에 도착한다.
 */
export function cameraArchiveHref(camera: string): string {
  const params = new URLSearchParams({ [CAMERA_PARAM]: camera });
  return `/archive?${params.toString()}#archive-search`;
}
