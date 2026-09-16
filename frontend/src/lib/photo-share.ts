import { photoCaption, type CaptionSource } from './caption';

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
 * 앨범을 아는 사진이면 앨범 주소로 만든다. `/archive`의 전체 필터 그리드는
 * 조건을 URL에 싣지 않으므로, 거기서 연 사진의 현재 주소(`/archive?p=`)를
 * 받은 사람은 그 사진이 목록에 없는 화면에 도착한다. 앨범을 모르면 `fallback`
 * (보통 지금 주소).
 */
export function photoShareUrl(photo: ShareablePhoto, origin: string, fallback: string): string {
  return photo.album_slug ? `${origin}/archive/${photo.album_slug}?p=${photo.id}` : fallback;
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
