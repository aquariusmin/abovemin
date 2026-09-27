import { describe, expect, it } from 'vitest';
import {
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
