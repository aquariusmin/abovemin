import { displayCamera, photoCaption, takenDate, type CaptionSource } from './caption';

/**
 * 사진 한 장을 가리키는 링크와, 그 링크를 담은 프린트 문의 메일.
 *
 * 라이트박스의 "링크 복사"와 "프린트 문의"가 같은 링크를 써야 한다 — 문의
 * 메일의 링크가 복사한 링크와 다른 화면을 열면, 무엇을 문의했는지가 흐려진다.
 */

export interface ShareablePhoto extends CaptionSource {
  id: number;
  album_slug?: string;
}

/**
 * 사진 한 장의 페이지(`/archive/[slug]/[id]`) 경로.
 *
 * 공유할 주소는 이쪽이다. 예전의 `?p=` 딥링크는 앨범 페이지를 통째로 내려받은
 * 뒤 클라이언트가 라이트박스를 여는 방식이라, 링크 미리보기(카카오톡·슬랙)는
 * 사진이 아니라 앨범 표지를 보여 줬고 검색엔진에는 사진 한 장짜리 문서가
 * 없었다. `?p=`는 이미 건네진 링크를 위해 그대로 동작한다(`PhotoGrid`).
 */
export function photoPagePath(photo: { id: number; album_slug: string }): string {
  return `/archive/${photo.album_slug}/${photo.id}`;
}

/** 제목도 장소도 없는 사진의 이름. 사진에서 흔히 쓰는 말이고, "사진 #231"보다 조용하다. */
export const UNTITLED = '무제';

/**
 * 사진 페이지의 제목(h1, `<title>`). 파일명·"-"는 제목이 아니다(`photoCaption`).
 * 제목이 없으면 장소가 이름이 된다 — 그때는 본문의 장소 줄과 같은 말을 두 번
 * 하지 않도록 `repeatsLocation`을 같이 알려 준다.
 */
export function photoPageTitle(photo: CaptionSource): { title: string; repeatsLocation: boolean } {
  const caption = photoCaption(photo);
  if (caption.title) return { title: caption.title, repeatsLocation: false };
  if (caption.location) return { title: caption.location, repeatsLocation: true };
  return { title: UNTITLED, repeatsLocation: false };
}

/**
 * 검색 결과와 링크 미리보기의 한 줄: "여수 · 2018.09.08 · Canon EOS 200D — Korea 컬렉션의 사진."
 * 화면용 구분자(`joinCaption`)의 줄바꿈 없는 공백은 메타 태그에서 뜻이 없어 보통 공백을 쓴다.
 */
export function photoPageDescription(
  photo: CaptionSource & { taken_at?: string | null; camera?: string | null },
  albumTitle: string,
): string {
  const caption = photoCaption(photo);
  const parts = [
    caption.location,
    takenDate(photo.taken_at) ?? caption.year,
    displayCamera(photo.camera),
  ].filter((v): v is string => Boolean(v));
  const tail = `${albumTitle} 컬렉션의 사진.`;
  return parts.length > 0 ? `${parts.join(' · ')} — ${tail}` : tail;
}

/**
 * 앨범을 아는 사진이면 사진 페이지 주소로 만든다. `/archive`의 전체 필터
 * 그리드는 조건을 URL에 다 싣지 않으므로, 거기서 연 사진의 현재 주소
 * (`/archive?p=`)를 받은 사람은 그 사진이 목록에 없는 화면에 도착한다.
 * 앨범을 모르면 `fallback`(보통 지금 주소).
 */
export function photoShareUrl(photo: ShareablePhoto, origin: string, fallback: string): string {
  return photo.album_slug ? `${origin}${photoPagePath({ id: photo.id, album_slug: photo.album_slug })}` : fallback;
}

/**
 * `mailto:` 주소. 제목과 본문은 `encodeURIComponent`로 싼다 — `mailto`는 폼
 * 인코딩이 아니라서 `+`가 공백이 되지 않고, 한글과 줄바꿈(`%0A`)도 이 방식이어야
 * 메일 앱이 그대로 읽는다.
 */
export function printInquiryMailto(email: string, photo: ShareablePhoto, url: string): string {
  const caption = photoCaption(photo);
  // 보통 공백으로 잇는다. 화면용 구분자(`joinCaption`)는 `·` 앞이 줄바꿈 없는
  // 공백인데, 메일 본문은 우리 CSS가 줄을 나누는 곳이 아니라 이득 없이 문자만 낯설다.
  const described = [caption.title, ...caption.meta].filter((v): v is string => Boolean(v)).join(' · ');
  const subject = `[phorage] 프린트 문의 — ${caption.title ?? caption.location ?? `사진 #${photo.id}`}`;
  const body = [
    '안녕하세요, 아래 사진의 프린트를 문의드립니다.',
    '',
    `사진: ${described || `#${photo.id}`}`,
    `링크: ${url}`,
    '',
    '원하는 크기:',
    '수량:',
    '받으실 곳(지역):',
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
