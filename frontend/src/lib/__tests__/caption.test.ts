import { describe, expect, it } from 'vitest';
import { cleanCaptionField, joinCaption, photoCaption, photoLabel } from '@/lib/caption';

describe('cleanCaptionField()', () => {
  it('대시와 공백뿐인 값을 "없음"으로 본다', () => {
    // DB에 제목 28장이 "-"로 들어 있다. 화면에 한 글자짜리 제목이 찍혔다.
    for (const v of ['-', '—', '–', '', '   ', ' - ', null, undefined]) {
      expect(cleanCaptionField(v)).toBeNull();
    }
  });

  it('실제 값은 앞뒤 공백만 걷어 내고 그대로 둔다', () => {
    expect(cleanCaptionField('  Seoul ')).toBe('Seoul');
    expect(cleanCaptionField('Tokyo-Osaka')).toBe('Tokyo-Osaka');
  });

  it('연도 0은 없는 값이다', () => {
    expect(cleanCaptionField(0)).toBeNull();
    expect(cleanCaptionField(2019)).toBe('2019');
  });
});

describe('photoCaption()', () => {
  it('빈 장소가 구분자만 남기지 않는다', () => {
    const c = photoCaption({ title: 'Morning', location: '-', year: 2019 });
    expect(c.meta).toEqual(['2019']);
    expect(joinCaption(c.meta)).toBe('2019');
  });

  it('제목과 장소가 같으면 (대소문자 무시) 한 번만 보여 준다', () => {
    const c = photoCaption({ title: 'Osaka', location: 'OSAKA', year: 2018 });
    expect(c.title).toBe('Osaka');
    expect(c.location).toBeNull();
    expect(c.meta).toEqual(['2018']);
  });

  it('제목이 없으면 장소는 메타 줄에 남는다', () => {
    const c = photoCaption({ title: '-', location: 'Busan', year: 2020 });
    expect(c.title).toBeNull();
    expect(joinCaption(c.meta)).toBe('Busan · 2020');
  });

  it('전부 비어 있으면 아무것도 남기지 않는다', () => {
    expect(photoCaption({ title: ' ', location: '', year: 0 })).toEqual({
      title: null,
      location: null,
      year: null,
      meta: [],
    });
  });
});

describe('파일명 제목', () => {
  it('사진 앱이 붙인 파일명은 제목으로 보지 않는다', () => {
    expect(photoCaption({ title: '54D43E53 EFB0 401D 99C9 3ED986C7238C 1 201 a', location: '서울', year: 2026 }).title).toBeNull();
    expect(photoCaption({ title: 'DSC03534' }).title).toBeNull();
    expect(photoCaption({ title: 'IMG_2041' }).title).toBeNull();
  });

  it('사람이 쓴 제목은 숫자가 섞여도 남긴다', () => {
    expect(photoCaption({ title: '뚝섬 한강공원' }).title).toBe('뚝섬 한강공원');
    expect(photoCaption({ title: 'Route 66' }).title).toBe('Route 66');
  });
});

describe('photoLabel()', () => {
  it('제목 → 장소 → 대체어 순으로 고른다', () => {
    expect(photoLabel({ title: 'Morning', location: 'Seoul' })).toBe('Morning');
    expect(photoLabel({ title: '-', location: 'Seoul' })).toBe('Seoul');
    expect(photoLabel({ title: '-', location: '' })).toBe('사진');
  });
});
