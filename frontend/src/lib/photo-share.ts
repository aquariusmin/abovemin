import { cleanCaptionField, displayCamera, photoCaption, takenDate, type CaptionSource } from './caption';
import { cloudinary } from './cloudinary';

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
 * 문서 제목(`<title>`, 공유 카드)에 쓸 이름. 화면의 h1은 `photoPageTitle` 그대로다.
 *
 * 제목이 없는 사진은 장소가 이름이 되고, 제목 칸을 장소로 채운 행도 많아서
 * 한 앨범의 여러 장이 같은 이름을 가진다 — 한 빌드에서 295쪽의 `<title>`이
 * 94가지뿐이었다. 검색 결과와 브라우저 탭에서 그 쪽들은 서로 구분되지 않는다.
 *
 * 앨범 안에서 이름이 겹칠 때만 한 마디를 덧붙인다. 겹치지 않는 사진의 제목은
 * 건드리지 않는다.
 *
 *  1. 촬영일이 있고 그것으로 갈리면 촬영일 — "여수 · 2018.09.08". 번호보다
 *     사진에 대한 사실이 낫다.
 *  2. 촬영일이 없거나, 같은 곳에서 같은 날 찍은 사진이 또 있으면 앨범 안의
 *     순서 — "여수 · 3/29". 화면 위쪽의 "3 / 29"와 같은 숫자다.
 *
 * 둘을 같이 쓰지는 않는다. 제목은 짧아야 뒤의 앨범 이름까지 잘리지 않고 보인다.
 * 이름 비교는 대소문자를 가리지 않는다("Osaka" / "OSAKA").
 */
export function photoDocumentTitle(
  photos: readonly (CaptionSource & { taken_at?: string | null })[],
  index: number,
): string {
  const key = (photo: CaptionSource) => photoPageTitle(photo).title.toLocaleLowerCase();
  const photo = photos[index];
  const { title } = photoPageTitle(photo);
  const name = key(photo);
  const twins = photos.filter((other, i) => i !== index && key(other) === name);
  if (twins.length === 0) return title;

  const date = takenDate(photo.taken_at);
  if (date && twins.every(other => takenDate(other.taken_at) !== date)) return `${title} · ${date}`;
  return `${title} · ${index + 1}/${photos.length}`;
}

/**
 * 사진 페이지가 실제로 내려 주는 이미지 주소(워터마크 포함, 긴 변 2000px 상한).
 *
 * 페이지의 `<Image>`, 구조화 데이터의 `contentUrl`, sitemap의 이미지 항목이 같은
 * 주소를 가리켜야 한다 — 검색엔진이 sitemap에서 본 이미지를 그 페이지에서 다시
 * 찾을 수 있어야 하고, 워터마크 없는 주소를 따로 알려 줄 이유가 없다.
 * Cloudinary가 아닌 주소는 그대로 돌아온다(`cloudinary()`).
 */
export function photoImageUrl(src: string): string {
  return cloudinary(src, { watermark: true, width: 2000 });
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

/** `taken_at`의 날짜만(ISO). 시각은 싣지 않는다 — 아래 `photoJsonLd`의 주석. */
function takenIsoDate(takenAt: string | null | undefined): string | null {
  const date = takenDate(takenAt);
  return date ? date.replaceAll('.', '-') : null;
}

/**
 * 사진 페이지의 구조화 데이터: 사진 한 장(`ImageObject`)과 그 자리
 * (`BreadcrumbList`: Archive → 앨범 → 사진).
 *
 * **가진 값만 적는다.** 없는 것을 채워 넣으면 검색엔진에게는 그것이 주장이 된다.
 *
 *  - `dateCreated`는 날짜까지만. `taken_at`은 카메라의 벽시계 시각을 UTC 자리에
 *    적어 둔 값이라(`takenDate`의 주석) 시각과 `Z`를 붙이면 틀린 시간대를 말하게 된다.
 *  - `datePublished`는 없다. 공개 조회가 행의 생성 시각을 싣지 않는다(`publicPhoto`).
 *  - `width`/`height`는 없다. 저장된 크기는 비율로만 믿을 수 있고(`Photo`의 주석),
 *    `contentUrl`이 실제로 내려 주는 픽셀 수와 같다는 보장이 없다.
 *  - 좌표는 없다. 사진 행에 없고, 장소 이름만 `contentLocation`으로 싣는다.
 *
 * `name`은 화면의 h1과 같다. 이름이 겹치는 사진을 가르는 일은 `<title>`의 몫이다.
 * `origin`은 `SITE_URL` — 브레드크럼의 `item`은 절대 주소여야 한다.
 */
export function photoJsonLd(
  photo: CaptionSource & { id: number; album_slug: string; src: string; taken_at?: string | null },
  album: { slug: string; title: string },
  origin: string,
): Array<Record<string, unknown> & { '@type': string }> {
  const { title } = photoPageTitle(photo);
  // `photoCaption`은 제목과 같은 장소를 접는다 — 여기서는 장소 그 자체가 필요하다.
  const location = cleanCaptionField(photo.location);
  const created = takenIsoDate(photo.taken_at);
  const url = `${origin}${photoPagePath(photo)}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: title,
      contentUrl: photoImageUrl(photo.src),
      url,
      ...(created ? { dateCreated: created } : {}),
      creator: { '@type': 'Organization', name: 'phorage', url: origin },
      ...(location ? { contentLocation: { '@type': 'Place', name: location } } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Archive', item: `${origin}/archive` },
        { '@type': 'ListItem', position: 2, name: album.title, item: `${origin}/archive/${album.slug}` },
        { '@type': 'ListItem', position: 3, name: title, item: url },
      ],
    },
  ];
}
