const PLACEHOLDERS = new Set(['-', '—', '–']);

export function cleanCaptionField(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  // `year`는 정수 컬럼이라 0이 "없음"으로 들어올 수 있다.
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(value) : null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDERS.has(trimmed)) return null;
  return trimmed;
}

// 업로드 위젯이 채운 파일명(iOS UUID, DSC0…)이 제목으로 남은 경우 — 제목 없음으로 본다.
const FILENAME_TITLE = [
  /^[0-9a-f]{8}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{12}\b/i,
  /^(img|dsc|dscf|dscn|pxl|mvimg)[\s_-]?\d{3,}/i,
  /^untitled$/i,
];

export function looksLikeFilename(title: string): boolean {
  return FILENAME_TITLE.some(re => re.test(title));
}

export interface CaptionSource {
  title?: string | null;
  location?: string | null;
  year?: number | string | null;
}

export interface Caption {
  title: string | null;
  location: string | null;
  year: string | null;
  meta: string[];
}

export function photoCaption(photo: CaptionSource): Caption {
  const rawTitle = cleanCaptionField(photo.title);
  const title = rawTitle && !looksLikeFilename(rawTitle) ? rawTitle : null;
  let location = cleanCaptionField(photo.location);
  const year = cleanCaptionField(photo.year);

  if (title && location && title.toLocaleLowerCase() === location.toLocaleLowerCase()) {
    location = null;
  }

  return {
    title,
    location,
    year,
    meta: [location, year].filter((v): v is string => v !== null),
  };
}

// `·` 앞은 줄바꿈 없는 공백(U+00A0), 뒤는 보통 공백 — 줄이 `·`로 시작하지 않게.
export const CAPTION_SEPARATOR = ' · ';

export function joinCaption(parts: string[]): string {
  return parts.join(CAPTION_SEPARATOR);
}

export function photoLabel(photo: CaptionSource, fallback = '사진'): string {
  const c = photoCaption(photo);
  return c.title ?? c.location ?? fallback;
}

export interface ExifSource {
  taken_at?: string | null;
  camera?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: number | null;
}

// `taken_at`은 벽시계 시각을 UTC 자리에 둔 값이라 UTC로 읽어야 한다(로컬 변환 시 하루 밀림).
export function takenDate(takenAt: string | null | undefined): string | null {
  if (!takenAt) return null;
  const date = new Date(takenAt);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

export function displayCamera(camera: string | null | undefined): string | null {
  const value = cleanCaptionField(camera);
  if (!value) return null;
  return value.replace(/^Apple\s+(?=iP(?:hone|ad|od))/, '');
}

export function exifParts(photo: ExifSource): string[] {
  const shutter = cleanCaptionField(photo.shutter);
  return [
    takenDate(photo.taken_at),
    displayCamera(photo.camera),
    cleanCaptionField(photo.focal_length),
    cleanCaptionField(photo.aperture),
    shutter ? (shutter.endsWith('s') ? shutter : `${shutter}s`) : null,
    photo.iso ? `ISO ${photo.iso}` : null,
  ].filter((part): part is string => part !== null);
}
