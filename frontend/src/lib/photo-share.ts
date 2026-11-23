import { cleanCaptionField, displayCamera, photoCaption, takenDate, type CaptionSource } from './caption';
import { cloudinary } from './cloudinary';

export interface ShareablePhoto extends CaptionSource {
  id: number;
  album_slug?: string;
}

export function photoPagePath(photo: { id: number; album_slug: string }): string {
  return `/archive/${photo.album_slug}/${photo.id}`;
}

export const UNTITLED = '무제';

export function photoPageTitle(photo: CaptionSource): { title: string; repeatsLocation: boolean } {
  const caption = photoCaption(photo);
  if (caption.title) return { title: caption.title, repeatsLocation: false };
  if (caption.location) return { title: caption.location, repeatsLocation: true };
  return { title: UNTITLED, repeatsLocation: false };
}

// 앨범 안에서 이름이 겹칠 때만 촬영일(갈리면) 또는 앨범 내 순서를 덧붙인다.
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

// 페이지 `<Image>`·JSON-LD `contentUrl`·sitemap 이미지가 같은 워터마크 주소를 가리켜야 한다.
export function photoImageUrl(src: string): string {
  return cloudinary(src, { watermark: true, width: 2000 });
}

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
  const tail = `${albumTitle} 앨범의 사진.`;
  return parts.length > 0 ? `${parts.join(' · ')} — ${tail}` : tail;
}

export function photoShareUrl(photo: ShareablePhoto, origin: string, fallback: string): string {
  return photo.album_slug ? `${origin}${photoPagePath({ id: photo.id, album_slug: photo.album_slug })}` : fallback;
}

// `mailto`는 폼 인코딩이 아니다 — `encodeURIComponent`로 싸야 `+`·한글·줄바꿈이 그대로 읽힌다.
export function printInquiryMailto(email: string, photo: ShareablePhoto, url: string): string {
  const caption = photoCaption(photo);
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

// 날짜만 — `taken_at`은 벽시계 시각이라 시각·`Z`를 붙이면 틀린 시간대가 된다.
function takenIsoDate(takenAt: string | null | undefined): string | null {
  const date = takenDate(takenAt);
  return date ? date.replaceAll('.', '-') : null;
}

// 가진 값만 적는다: datePublished·width/height·좌표는 없다(없는 값을 채우면 검색엔진에 주장이 된다).
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
