import { describe, expect, it } from 'vitest';
import {
  photoDocumentTitle,
  photoImageUrl,
  photoJsonLd,
  photoPageDescription,
  photoPagePath,
  photoPageTitle,
  photoShareUrl,
  printInquiryMailto,
  UNTITLED,
} from '@/lib/photo-share';
import { displayCamera, exifParts, takenDate } from '@/lib/caption';

/**
 * 이 파일이 지키는 것: 프린트 문의 메일이 "링크 복사"와 같은 사진 링크를 싣고,
 * 메일 앱이 한글·줄바꿈을 그대로 읽는 모양으로 인코딩된다. 그리고 라이트박스의
 * 촬영 정보 줄이 빈 칸 없이 모인다.
 */

const photo = { id: 42, album_slug: 'japan', title: 'Morning', location: 'Kyoto', year: 2019 };

describe('photoShareUrl', () => {
  it('사진 페이지 주소 — 앨범의 ?p= 딥링크가 아니다', () => {
    expect(photoShareUrl(photo, 'https://www.abovemin.com', 'x')).toBe('https://www.abovemin.com/archive/japan/42');
  });

  it('photoPagePath는 origin 없는 경로', () => {
    expect(photoPagePath({ id: 7, album_slug: 'korea' })).toBe('/archive/korea/7');
  });

  it('앨범을 모르면 지금 주소', () => {
    expect(photoShareUrl({ id: 1 }, 'https://a.b', 'https://a.b/archive?p=1')).toBe('https://a.b/archive?p=1');
  });
});

describe('photoPageTitle / photoPageDescription', () => {
  it('제목 → 장소 → 무제', () => {
    expect(photoPageTitle(photo)).toEqual({ title: 'Morning', repeatsLocation: false });
    expect(photoPageTitle({ title: 'IMG_1234', location: '여수' })).toEqual({ title: '여수', repeatsLocation: true });
    expect(photoPageTitle({ title: '-', location: ' ' })).toEqual({ title: UNTITLED, repeatsLocation: false });
  });

  it('설명은 장소 · 촬영일(없으면 연도) · 카메라 — 앨범', () => {
    expect(
      photoPageDescription(
        { title: 'Somewhere', location: '여수', year: 2018, taken_at: '2018-09-08T18:53:14+00:00', camera: 'Apple iPhone 7' },
        'Korea',
      ),
    ).toBe('여수 · 2018.09.08 · iPhone 7 — Korea 컬렉션의 사진.');
    expect(photoPageDescription({ title: '-', location: '-', year: 2020 }, 'Swiss')).toBe('2020 — Swiss 컬렉션의 사진.');
    expect(photoPageDescription({}, 'Swiss')).toBe('Swiss 컬렉션의 사진.');
  });
});

describe('photoDocumentTitle', () => {
  it('앨범 안에서 이름이 하나뿐이면 그대로 — h1과 같다', () => {
    const photos = [{ title: 'Morning', location: 'Kyoto' }, { title: '-', location: 'Kyoto' }];
    expect(photoDocumentTitle(photos, 0)).toBe('Morning');
    expect(photoDocumentTitle(photos, 1)).toBe('Kyoto');
    // 화면의 제목은 어느 경우에도 바뀌지 않는다.
    expect(photoPageTitle(photos[1])).toEqual({ title: 'Kyoto', repeatsLocation: true });
  });

  it('이름이 겹치면 촬영일로 가른다', () => {
    const photos = [
      { title: 'IMG_1234', location: '여수', taken_at: '2018-09-08T18:53:14+00:00' },
      { title: '-', location: '여수', taken_at: '2018-09-09T09:00:00+00:00' },
    ];
    expect(photoDocumentTitle(photos, 0)).toBe('여수 · 2018.09.08');
    expect(photoDocumentTitle(photos, 1)).toBe('여수 · 2018.09.09');
  });

  it('촬영일이 없으면 앨범 안의 순서', () => {
    const photos = [
      { title: '-', location: '여수', taken_at: '2018-09-08T18:53:14+00:00' },
      { title: 'Somewhere' },
      { title: '-', location: '여수' },
    ];
    expect(photoDocumentTitle(photos, 0)).toBe('여수 · 2018.09.08');
    expect(photoDocumentTitle(photos, 2)).toBe('여수 · 3/3');
  });

  it('같은 곳에서 같은 날 찍은 사진끼리는 촬영일로 갈리지 않으므로 순서', () => {
    const photos = [
      { location: '여수', taken_at: '2018-09-08T10:00:00+00:00' },
      { location: '여수', taken_at: '2018-09-08T18:00:00+00:00' },
      { location: '여수', taken_at: '2018-09-10T18:00:00+00:00' },
    ];
    expect(photoDocumentTitle(photos, 0)).toBe('여수 · 1/3');
    expect(photoDocumentTitle(photos, 1)).toBe('여수 · 2/3');
    expect(photoDocumentTitle(photos, 2)).toBe('여수 · 2018.09.10');
  });

  it('제목을 장소로 채운 행과 대소문자만 다른 이름, 무제도 겹친 것으로 본다', () => {
    const photos = [{ title: 'Osaka', location: 'OSAKA' }, { title: 'OSAKA' }, { title: '-' }, {}];
    expect(photoDocumentTitle(photos, 0)).toBe('Osaka · 1/4');
    expect(photoDocumentTitle(photos, 1)).toBe('OSAKA · 2/4');
    expect(photoDocumentTitle(photos, 2)).toBe(`${UNTITLED} · 3/4`);
    expect(photoDocumentTitle(photos, 3)).toBe(`${UNTITLED} · 4/4`);
  });

  it('한 앨범의 문서 제목은 모두 다르다', () => {
    const photos = [
      { location: '여수', taken_at: '2018-09-08T10:00:00+00:00' },
      { location: '여수', taken_at: '2018-09-08T18:00:00+00:00' },
      { location: '여수' },
      { title: 'Morning', location: '여수' },
      { title: 'morning' },
      {},
    ];
    const titles = photos.map((_, i) => photoDocumentTitle(photos, i));
    expect(new Set(titles).size).toBe(photos.length);
  });
});

describe('photoJsonLd', () => {
  const src = 'https://res.cloudinary.com/demo/image/upload/v1/phorage/archive/a.jpg';
  const album = { slug: 'korea', title: 'Korea' };
  const origin = 'https://www.abovemin.com';

  it('ImageObject — 가진 값만, 페이지가 그리는 이미지 주소로', () => {
    const [image] = photoJsonLd(
      { id: 7, album_slug: 'korea', src, title: '-', location: '여수', taken_at: '2018-09-08T23:53:14+00:00' },
      album,
      origin,
    );
    expect(image).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: '여수',
      contentUrl: photoImageUrl(src),
      url: 'https://www.abovemin.com/archive/korea/7',
      dateCreated: '2018-09-08',
      creator: { '@type': 'Organization', name: 'phorage', url: origin },
      contentLocation: { '@type': 'Place', name: '여수' },
    });
    // 워터마크(사인 오버레이)가 실린 주소여야 한다 — 페이지가 그리는 것과 같은 것.
    expect(image.contentUrl).toContain('l_phorage:brand:signature');
  });

  it('촬영일·장소가 없으면 그 칸이 없다. 좌표와 크기는 어느 경우에도 없다', () => {
    const [image] = photoJsonLd({ id: 7, album_slug: 'korea', src, title: 'Morning', location: '-' }, album, origin);
    expect(image).not.toHaveProperty('dateCreated');
    expect(image).not.toHaveProperty('contentLocation');
    const text = JSON.stringify(image);
    for (const key of ['geo', 'latitude', 'longitude', 'width', 'height', 'datePublished']) {
      expect(text).not.toContain(`"${key}"`);
    }
  });

  it('제목이 장소와 같아도 장소는 장소로 실린다', () => {
    const [image] = photoJsonLd({ id: 7, album_slug: 'korea', src, title: 'Osaka', location: 'OSAKA' }, album, origin);
    expect(image.name).toBe('Osaka');
    expect(image.contentLocation).toEqual({ '@type': 'Place', name: 'OSAKA' });
  });

  it('BreadcrumbList — Archive → 앨범 → 사진, 절대 주소', () => {
    const [, crumbs] = photoJsonLd({ id: 7, album_slug: 'korea', src, title: 'Morning' }, album, origin);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Archive', item: 'https://www.abovemin.com/archive' },
      { '@type': 'ListItem', position: 2, name: 'Korea', item: 'https://www.abovemin.com/archive/korea' },
      { '@type': 'ListItem', position: 3, name: 'Morning', item: 'https://www.abovemin.com/archive/korea/7' },
    ]);
  });
});

describe('printInquiryMailto', () => {
  const href = printInquiryMailto('owner@example.com', photo, 'https://www.abovemin.com/archive/japan/42');
  const url = new URL(href);

  it('주소와 제목', () => {
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('owner@example.com');
    expect(url.searchParams.get('subject')).toBe('[phorage] 프린트 문의 — Morning');
  });

  it('본문에 캡션과 링크가 들어간다', () => {
    const body = url.searchParams.get('body')!;
    expect(body).toContain('사진: Morning · Kyoto · 2019');
    expect(body).toContain('링크: https://www.abovemin.com/archive/japan/42');
  });

  it('공백은 %20, 줄바꿈은 %0A — 폼 인코딩(+)이 아니다', () => {
    expect(href).not.toContain('+');
    expect(href).toContain('%0A');
    expect(href).toContain('%20');
  });

  it('제목이 파일명뿐이면 장소로, 그것도 없으면 번호로 부른다', () => {
    const noTitle = new URL(printInquiryMailto('a@b.c', { id: 7, title: 'IMG_1234', location: '서울' }, 'u'));
    expect(noTitle.searchParams.get('subject')).toBe('[phorage] 프린트 문의 — 서울');
    const nothing = new URL(printInquiryMailto('a@b.c', { id: 7, title: '-', location: '' }, 'u'));
    expect(nothing.searchParams.get('subject')).toBe('[phorage] 프린트 문의 — 사진 #7');
    expect(nothing.searchParams.get('body')).toContain('사진: #7');
  });
});

describe('exifParts', () => {
  it('값이 있는 칸만 한 줄로', () => {
    expect(
      exifParts({
        taken_at: '2019-07-31T14:55:19.000Z',
        camera: 'Apple iPhone 7',
        focal_length: '4mm',
        aperture: 'f/1.8',
        shutter: '1/1053',
        iso: 20,
      }),
    ).toEqual(['2019.07.31', 'iPhone 7', '4mm', 'f/1.8', '1/1053s', 'ISO 20']);
  });

  it('초 단위 셔터에는 단위를 두 번 붙이지 않는다', () => {
    expect(exifParts({ shutter: '2s' })).toEqual(['2s']);
  });

  it('아무것도 없으면 빈 배열', () => {
    expect(exifParts({})).toEqual([]);
    expect(exifParts({ camera: null, iso: null, taken_at: null })).toEqual([]);
  });
});

describe('takenDate', () => {
  it('UTC로 읽는다 — 밤 11시 사진이 보는 사람의 시간대로 하루 밀리지 않는다', () => {
    expect(takenDate('2023-08-04T23:30:00.000Z')).toBe('2023.08.04');
    expect(takenDate('2023-08-04T00:10:00+00:00')).toBe('2023.08.04');
    expect(takenDate('nope')).toBeNull();
    expect(takenDate(null)).toBeNull();
  });
});

describe('displayCamera', () => {
  it('Apple 기기만 제조사를 줄인다', () => {
    expect(displayCamera('Apple iPhone 15 Pro Max')).toBe('iPhone 15 Pro Max');
    expect(displayCamera('Apple iPod touch')).toBe('iPod touch');
    expect(displayCamera('SONY ILCE-7RM3')).toBe('SONY ILCE-7RM3');
    expect(displayCamera('Canon EOS 200D')).toBe('Canon EOS 200D');
  });
});
