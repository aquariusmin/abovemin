/**
 * 사진 캡션(제목 · 장소 · 연도)을 공개 화면에 내보낼 모양으로 정리한다.
 *
 * DB에는 "값 없음"이 여러 모양으로 들어 있다. 제목 28장이 `"-"`이고 장소
 * 6장이 `"-"`나 빈 문자열인데, 그리드와 라이트박스는 그 값을 그대로 찍어
 * `-` 한 글자짜리 제목이나 `&nbsp;· 2019`처럼 앞이 빈 구분자를 만들고 있었다.
 * 입력 화면에서 "비워 두기"를 대시로 적는 습관은 사람이 가진 것이라 데이터를
 * 고치는 것만으로는 다시 생긴다. 그래서 읽는 쪽에서 한 번에 거른다.
 *
 * 제목과 장소가 같은 경우(`Osaka` / `OSAKA`)도 여기서 접는다. 제목을 장소로
 * 채워 넣은 행이 많아 "Osaka / OSAKA · 2018"처럼 같은 말이 두 번 나왔다.
 *
 * 렌더링과 무관한 순수 함수로 둔 이유: 앨범 그리드·라이트박스·전체 필터가
 * 모두 같은 규칙을 써야 하고, 규칙 자체는 테스트로 고정할 수 있어야 한다.
 */

/** "값 없음"을 뜻하는 자리표시자. 비교 전에 앞뒤 공백을 걷어 낸다. */
const PLACEHOLDERS = new Set(['-', '—', '–']);

/** 공개 화면에 내보낼 만한 문자열이면 다듬어서, 아니면 null. */
export function cleanCaptionField(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  // `year`는 정수 컬럼이라 0이 "없음"으로 들어올 수 있다.
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(value) : null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDERS.has(trimmed)) return null;
  return trimmed;
}

/**
 * 카메라·사진 앱이 붙인 파일명이 그대로 제목이 된 경우.
 *
 * 업로드 위젯이 제목 칸을 파일명으로 미리 채우기 때문에, 확인 없이 저장하면
 * "54D43E53 EFB0 401D 99C9 3ED986C7238C 1 201 a"(iOS 사진 앱 내보내기의
 * UUID)나 "DSC03534" 같은 문자열이 제목으로 남는다. 사람에게는 "-"와 같은
 * 뜻이다 — 제목이 없다. 제목에만 적용한다: 장소가 이런 모양일 리는 없다.
 */
const FILENAME_TITLE = [
  /^[0-9a-f]{8}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{12}\b/i,
  /^(img|dsc|dscf|dscn|pxl|mvimg)[\s_-]?\d{3,}/i,
  // 파일명이 비었을 때 업로드 위젯이 넣는 기본값.
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
  /** 제목 아래 한 줄로 이어 붙일 값들 (장소, 연도 순). 빈 값은 이미 빠져 있다. */
  meta: string[];
}

export function photoCaption(photo: CaptionSource): Caption {
  const rawTitle = cleanCaptionField(photo.title);
  const title = rawTitle && !looksLikeFilename(rawTitle) ? rawTitle : null;
  let location = cleanCaptionField(photo.location);
  const year = cleanCaptionField(photo.year);

  // 같은 말을 두 번 하지 않는다. 제목 쪽을 남기는 이유: 제목 줄이 더 크게
  // 찍히므로, 거기 있는 것이 한 번 보이는 쪽으로 자연스럽다.
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

/**
 * 구분자 규칙(DESIGN.md § Line Breaking): `·` 앞은 줄바꿈 없는 공백, 뒤는
 * 보통 공백. 줄이 `·`로 시작하는 일이 없도록.
 */
export const CAPTION_SEPARATOR = ' · ';

export function joinCaption(parts: string[]): string {
  return parts.join(CAPTION_SEPARATOR);
}

/** `alt`·`aria-label`용 한 줄. 제목이 없으면 장소, 그것도 없으면 대체어. */
export function photoLabel(photo: CaptionSource, fallback = '사진'): string {
  const c = photoCaption(photo);
  return c.title ?? c.location ?? fallback;
}
