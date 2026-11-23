import { cleanCaptionField, displayCamera } from './caption';

// 값은 DB의 원래 이름, 라벨만 `displayCamera`로 줄인다(줄인 이름을 값으로 쓰면 다른 제조사가 합쳐진다).
export interface CameraOption {
  value: string;
  label: string;
  count: number;
}

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

export const CAMERA_PARAM = 'camera';

export function cameraArchiveHref(camera: string): string {
  const params = new URLSearchParams({ [CAMERA_PARAM]: camera });
  return `/archive?${params.toString()}#archive-search`;
}
