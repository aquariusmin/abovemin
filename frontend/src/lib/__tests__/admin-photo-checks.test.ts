import { describe, expect, it } from 'vitest';
import {
  chunkIds,
  hasLocationInOriginal,
  isLowResolution,
  isMissingExif,
  isYearMismatch,
  issueCount,
  planYearSync,
  runDataChecks,
  takenYear,
  type CheckAlbum,
  type CheckPhoto,
} from '@/lib/admin/data-checks';

/**
 * 사진 단위 점검(연도·저해상도·촬영 정보·위치가 남은 원본)과 "촬영일 기준으로
 * 연도 맞추기"의 계획. 개요와 아카이브 탭의 필터가 같은 함수를 쓰므로, 여기서
 * 규칙이 고정되면 두 화면이 같은 사진을 가리킨다.
 */

const src = (id: number) => `https://res.cloudinary.com/demo/image/upload/v1/phorage/archive/p${id}.jpg`;

describe('takenYear', () => {
  it('UTC 연도로 읽는다 — 벽시계 시각을 UTC 자리에 적은 값이다', () => {
    expect(takenYear('2019-12-31T23:30:00.000Z')).toBe(2019);
    expect(takenYear('2020-01-01T00:10:00+00:00')).toBe(2020);
  });

  it('없거나 읽을 수 없으면 null', () => {
    expect(takenYear(null)).toBeNull();
    expect(takenYear(undefined)).toBeNull();
    expect(takenYear('not a date')).toBeNull();
  });
});

describe('사진 단위 규칙', () => {
  it('연도 불일치: 둘 다 있을 때만 비교한다', () => {
    expect(isYearMismatch({ year: 2018, taken_at: '2019-07-31T14:55:19.000Z' })).toBe(true);
    expect(isYearMismatch({ year: 2019, taken_at: '2019-07-31T14:55:19.000Z' })).toBe(false);
    expect(isYearMismatch({ year: 2019, taken_at: null })).toBe(false);
    expect(isYearMismatch({ year: null, taken_at: '2019-07-31T14:55:19.000Z' })).toBe(false);
    expect(isYearMismatch({})).toBe(false);
  });

  it('저해상도: 긴 변이 800px 미만', () => {
    expect(isLowResolution({ width: 725, height: 483 })).toBe(true);
    expect(isLowResolution({ width: 310, height: 799 })).toBe(true);
    expect(isLowResolution({ width: 800, height: 600 })).toBe(false);
    expect(isLowResolution({ width: 886, height: 886 })).toBe(false);
    expect(isLowResolution({ width: null, height: 600 })).toBe(false);
    expect(isLowResolution({ width: 0, height: 0 })).toBe(false);
  });

  it('촬영 정보 없음: 확인한 뒤에도 카메라와 촬영일이 둘 다 없을 때만', () => {
    const checked = '2026-09-16T00:00:00Z';
    expect(isMissingExif({ exif_checked_at: checked, camera: null, taken_at: null })).toBe(true);
    expect(isMissingExif({ exif_checked_at: checked, camera: 'Apple iPhone 7', taken_at: null })).toBe(false);
    expect(isMissingExif({ exif_checked_at: checked, camera: null, taken_at: '2019-07-31T00:00:00Z' })).toBe(false);
    expect(isMissingExif({ exif_checked_at: null, camera: null, taken_at: null })).toBe(false);
  });

  it('위치가 남은 원본: true만 — null은 아직 모름', () => {
    expect(hasLocationInOriginal({ gps_in_original: true })).toBe(true);
    expect(hasLocationInOriginal({ gps_in_original: false })).toBe(false);
    expect(hasLocationInOriginal({ gps_in_original: null })).toBe(false);
    expect(hasLocationInOriginal({})).toBe(false);
  });
});

describe('planYearSync', () => {
  const now = new Date('2026-09-17T00:00:00Z');

  it('어긋난 사진만, 바꿀 연도별로 묶는다', () => {
    expect(
      planYearSync(
        [
          { id: 1, year: 2018, taken_at: '2019-07-31T14:55:19.000Z' },
          { id: 2, year: 2019, taken_at: '2019-01-01T00:00:00.000Z' },
          { id: 3, year: 2020, taken_at: '2019-12-31T23:59:59.000Z' },
          { id: 4, year: 2017, taken_at: '2016-05-05T10:00:00.000Z' },
          { id: 5, year: 2017, taken_at: null },
        ],
        now,
      ),
    ).toEqual([
      { year: 2016, ids: [4] },
      { year: 2019, ids: [1, 3] },
    ]);
  });

  it('연도 규칙 밖의 촬영일(시계가 틀린 카메라)은 건너뛴다', () => {
    expect(
      planYearSync(
        [
          { id: 1, year: 2019, taken_at: '1800-01-01T00:00:00.000Z' },
          { id: 2, year: 2019, taken_at: '2031-01-01T00:00:00.000Z' },
          { id: 3, year: 2019, taken_at: '2027-03-01T00:00:00.000Z' },
        ],
        now,
      ),
    ).toEqual([{ year: 2027, ids: [3] }]);
  });
});

describe('chunkIds', () => {
  it('상한에 맞춰 순서대로 나눈다', () => {
    expect(chunkIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkIds([], 200)).toEqual([]);
    expect(() => chunkIds([1], 0)).toThrow();
  });
});

describe('runDataChecks — 사진 단위 점검', () => {
  const albums: CheckAlbum[] = [
    { slug: 'korea', title: 'Korea', cover: src(1) },
    { slug: 'japan', title: 'Japan', cover: src(3) },
  ];
  const base = { title: 'x', location: 'y', exif_checked_at: '2026-09-16T00:00:00Z', camera: 'Apple iPhone 7' };
  const photos: CheckPhoto[] = [
    { ...base, id: 3, album_slug: 'japan', src: src(3), year: 2018, taken_at: '2019-04-01T09:00:00.000Z', width: 1500, height: 1000, gps_in_original: false },
    { ...base, id: 1, album_slug: 'korea', src: src(1), title: 'Namsan', year: 2019, taken_at: '2019-07-31T14:55:19.000Z', width: 725, height: 483, gps_in_original: true },
    { ...base, id: 2, album_slug: 'korea', src: src(2), year: 2020, taken_at: '2019-12-31T23:00:00.000Z', width: 1500, height: 1000, camera: null, gps_in_original: null },
    { ...base, id: 4, album_slug: 'korea', src: src(4), year: 2019, taken_at: null, width: 520, height: 780, camera: null, gps_in_original: null },
  ];
  const report = runDataChecks({ albums, photos, products: [] });

  it('연도 불일치 — 앨범 순서, 앨범 안에서는 id 순', () => {
    expect(report.yearMismatches).toEqual([
      { id: 2, album_slug: 'korea', album_title: 'Korea', title: 'x', year: 2020, taken_year: 2019 },
      { id: 3, album_slug: 'japan', album_title: 'Japan', title: 'x', year: 2018, taken_year: 2019 },
    ]);
  });

  it('저해상도는 크기와 함께', () => {
    expect(report.lowResolution).toEqual([
      { id: 1, album_slug: 'korea', album_title: 'Korea', title: 'Namsan', width: 725, height: 483 },
      { id: 4, album_slug: 'korea', album_title: 'Korea', title: 'x', width: 520, height: 780 },
    ]);
  });

  it('촬영 정보 없음은 앨범별 개수', () => {
    expect(report.missingExif).toEqual([{ slug: 'korea', title: 'Korea', count: 1 }]);
  });

  it('위치가 남은 원본', () => {
    expect(report.locationInOriginal).toEqual([{ id: 1, album_slug: 'korea', album_title: 'Korea', title: 'Namsan' }]);
    expect(issueCount(report)).toBe(2 + 2 + 1 + 1);
  });

  it('마이그레이션 전(컬럼 없음)에는 아무것도 찾지 않는다', () => {
    const legacy = runDataChecks({
      albums,
      photos: [{ id: 1, album_slug: 'korea', src: src(1), title: 'Namsan', location: '서울' }],
      products: [],
    });
    expect(legacy.yearMismatches).toEqual([]);
    expect(legacy.lowResolution).toEqual([]);
    expect(legacy.missingExif).toEqual([]);
    expect(legacy.locationInOriginal).toEqual([]);
  });
});
