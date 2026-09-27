import { describe, expect, it } from 'vitest';
import { groupCoordsByPlace, hasLocationMetadata, normalizeResource, placeFromCoords } from '@/lib/admin/photo-metadata';
import { MetadataRecheck, PlaceCoord, YearSync } from '@/lib/admin/schemas';
import { PHOTO_COLUMN_LEVEL, photoColumnSets, selectWithColumnSets } from '@/lib/admin/photo-columns';

/**
 * 업로드 프라이버시의 서버 쪽: 저장 본문의 좌표는 서버가 다시 자르고, 원본에
 * 남은 위치 정보는 표시만 하며, 마이그레이션이 빠진 만큼 내려가며 읽는다.
 */

describe('PlaceCoord', () => {
  it('서버가 다시 소수점 한 자리로 자른다', () => {
    expect(PlaceCoord.parse({ lat: 37.566535, lng: 126.977969 })).toEqual({ lat: 37.6, lng: 127 });
    expect(PlaceCoord.parse({ lat: -33.86, lng: 151.21 })).toEqual({ lat: -33.9, lng: 151.2 });
  });

  it('범위 밖·문자열·모르는 키는 거절한다', () => {
    expect(PlaceCoord.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
    expect(PlaceCoord.safeParse({ lat: 0, lng: 181 }).success).toBe(false);
    expect(PlaceCoord.safeParse({ lat: '37.5', lng: 127 }).success).toBe(false);
    expect(PlaceCoord.safeParse({ lat: 37.5, lng: 127, precise: [37.566535, 126.977969] }).success).toBe(false);
    expect(PlaceCoord.safeParse({ lat: Number.NaN, lng: 127 }).success).toBe(false);
  });
});

describe('YearSync / MetadataRecheck', () => {
  it('id 목록만 받는다 — 연도는 서버가 촬영일에서 계산한다', () => {
    expect(YearSync.safeParse({ ids: [1, 2] }).success).toBe(true);
    expect(YearSync.safeParse({ ids: [1], year: 2019 }).success).toBe(false);
    expect(YearSync.safeParse({ ids: [] }).success).toBe(false);
    expect(YearSync.safeParse({ ids: [1, 1] }).success).toBe(false);
  });

  it('다시 확인은 한 번에 20장까지', () => {
    expect(MetadataRecheck.safeParse({ ids: Array.from({ length: 20 }, (_, i) => i + 1) }).success).toBe(true);
    expect(MetadataRecheck.safeParse({ ids: Array.from({ length: 21 }, (_, i) => i + 1) }).success).toBe(false);
  });
});

describe('hasLocationMetadata', () => {
  it('GPS 좌표나 도시·세부 위치가 있으면 true', () => {
    expect(hasLocationMetadata({ GPSLatitude: `41 deg 46' 28.77" N`, GPSLongitude: `77 deg 26' 44.50" W` })).toBe(true);
    expect(hasLocationMetadata({ GPSPosition: '41.77 N, 77.44 W' })).toBe(true);
    expect(hasLocationMetadata({ City: 'Seoul' })).toBe(true);
    expect(hasLocationMetadata({ 'Sub-location': 'Namsan' })).toBe(true);
  });

  it('촬영 정보·나라 이름·빈 값·GPS 버전만으로는 false', () => {
    expect(hasLocationMetadata({ Make: 'Apple', Model: 'iPhone 7', DateTimeOriginal: '2019:07:31 14:55:19' })).toBe(false);
    expect(hasLocationMetadata({ Country: 'South Korea', GPSVersionID: '2.2.0.0' })).toBe(false);
    expect(hasLocationMetadata({ GPSLatitude: '  ', City: '' })).toBe(false);
  });

  it('normalizeResource가 같이 알려 준다', () => {
    expect(normalizeResource({ image_metadata: { GPSLatitude: '37.5', GPSLongitude: '127' } }).hasLocation).toBe(true);
    expect(normalizeResource({ width: 1500, height: 1000 }).hasLocation).toBe(false);
  });
});

describe('groupCoordsByPlace', () => {
  it('장소별로 모으고, 이름이나 좌표가 없는 항목은 뺀다', () => {
    const seoul = { lat: 37.6, lng: 127 };
    const groups = groupCoordsByPlace([
      { place: '서울', coord: seoul },
      { place: '서울', coord: { lat: 37.5, lng: 127 } },
      { place: '서울', coord: null },
      { place: null, coord: seoul },
      { place: '', coord: seoul },
      { place: '부산', coord: { lat: 35.1, lng: 129 } },
    ]);
    expect([...groups.keys()]).toEqual(['서울', '부산']);
    expect(groups.get('서울')).toHaveLength(2);
    expect(placeFromCoords(groups.get('부산')!)).toEqual({ lat: 35.1, lng: 129 });
  });
});

describe('selectWithColumnSets', () => {
  const missing = { code: '42703', message: 'column photos.gps_in_original does not exist' };
  const sets = photoColumnSets('id, src');

  it('컬럼 묶음은 전부 → 위치 플래그 없음 → 촬영 정보 없음 → 기본 순', () => {
    expect(sets).toHaveLength(4);
    expect(sets[PHOTO_COLUMN_LEVEL.full]).toContain('gps_in_original');
    expect(sets[PHOTO_COLUMN_LEVEL.noPrivacy]).not.toContain('gps_in_original');
    expect(sets[PHOTO_COLUMN_LEVEL.noPrivacy]).toContain('exif_checked_at');
    expect(sets[PHOTO_COLUMN_LEVEL.noExtras]).toBe('id, src, hidden, created_at');
    expect(sets[PHOTO_COLUMN_LEVEL.legacy]).toBe('id, src');
  });

  it('컬럼이 없다는 오류일 때만 한 단계씩 내려간다', async () => {
    const tried: string[] = [];
    const result = await selectWithColumnSets('test', sets, async columns => {
      tried.push(columns);
      return tried.length < 3 ? { data: null, error: missing } : { data: [{ id: 1 }], error: null };
    });
    expect(result.level).toBe(2);
    expect(result.data).toEqual([{ id: 1 }]);
    expect(tried).toEqual(sets.slice(0, 3));
  });

  it('다른 오류는 그 자리에서 돌려준다', async () => {
    const outage = { code: '08006', message: 'connection failure' };
    const result = await selectWithColumnSets('test', sets, async () => ({ data: null, error: outage }));
    expect(result.level).toBe(0);
    expect(result.error).toBe(outage);
  });

  it('마지막 단계의 오류는 그대로 돌려준다', async () => {
    const result = await selectWithColumnSets('test', sets, async () => ({ data: null, error: missing }));
    expect(result.level).toBe(3);
    expect(result.error).toBe(missing);
  });
});
