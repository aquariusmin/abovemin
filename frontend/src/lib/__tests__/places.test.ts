import { describe, expect, it } from 'vitest';
import { REGIONS, availableRegions, buildMapPlaces, dotRadius, inRegion, placeFromRow } from '@/lib/places';

/**
 * 이 파일이 지키는 것: 지도에 나가는 좌표는 소수점 한 자리를 넘지 않고,
 * 필터와 같은 이름 규칙으로 사진 수를 센다.
 */

describe('placeFromRow', () => {
  it('숫자든 문자열이든 소수점 한 자리 좌표로', () => {
    expect(placeFromRow({ name: '서울', lat: 37.5, lng: '127.0' })).toEqual({ name: '서울', lat: 37.5, lng: 127 });
  });

  it('더 정밀한 값이 들어와도 한 자리로 자른다', () => {
    expect(placeFromRow({ name: 'Kyoto', lat: 35.01163, lng: 135.76802 })).toEqual({ name: 'Kyoto', lat: 35, lng: 135.8 });
  });

  it('범위 밖·빈 이름·자리표시자는 버린다', () => {
    expect(placeFromRow({ name: 'x', lat: 91, lng: 0 })).toBeNull();
    expect(placeFromRow({ name: 'x', lat: 10, lng: 'abc' })).toBeNull();
    expect(placeFromRow({ name: '-', lat: 10, lng: 10 })).toBeNull();
    expect(placeFromRow({ lat: 10, lng: 10 })).toBeNull();
  });
});

describe('buildMapPlaces', () => {
  const places = [
    { name: '서울', lat: 37.5, lng: 127 },
    { name: 'NYC', lat: 40.7, lng: -74 },
    { name: 'Lucerne', lat: 47.1, lng: 8.3 },
  ];

  it('필터와 같은 규칙으로 센다 — 앞뒤 공백은 같은 곳, "-"는 장소가 아니다', () => {
    const photos = [{ location: '서울' }, { location: ' 서울 ' }, { location: 'NYC' }, { location: '-' }, { location: null }];
    expect(buildMapPlaces(photos, places)).toEqual([
      { name: '서울', lat: 37.5, lng: 127, count: 2 },
      { name: 'NYC', lat: 40.7, lng: -74, count: 1 },
    ]);
  });

  it('좌표가 없는 장소는 지도에 없다', () => {
    expect(buildMapPlaces([{ location: '제주' }], places)).toEqual([]);
  });
});

describe('regions', () => {
  it('점이 있는 지역만 칩으로 남는다', () => {
    const ids = availableRegions([{ name: '서울', lat: 37.5, lng: 127 }]).map(r => r.id);
    expect(ids).toEqual(['world', 'korea']);
  });

  it('지역 틀이 실제 장소를 담는다', () => {
    const region = (id: string) => REGIONS.find(r => r.id === id)!;
    expect(inRegion({ name: '제주', lat: 33.5, lng: 126.5 }, region('korea'))).toBe(true);
    expect(inRegion({ name: 'Hokkaido', lat: 43.1, lng: 141.4 }, region('japan'))).toBe(true);
    expect(inRegion({ name: 'Orlando', lat: 28.5, lng: -81.4 }, region('north-america'))).toBe(true);
    expect(inRegion({ name: 'Melbourne', lat: -37.8, lng: 145 }, region('australia'))).toBe(true);
    expect(inRegion({ name: 'Interlaken', lat: 46.7, lng: 7.9 }, region('europe'))).toBe(true);
    expect(inRegion({ name: 'NYC', lat: 40.7, lng: -74 }, region('europe'))).toBe(false);
  });
});

describe('dotRadius', () => {
  it('넓이가 사진 수에 비례한다(제곱근 척도)', () => {
    const r1 = dotRadius(1, 64, { min: 0, maxRadius: 16 });
    const r64 = dotRadius(64, 64, { min: 0, maxRadius: 16 });
    expect(r64).toBe(16);
    expect((r64 / r1) ** 2).toBeCloseTo(64, 5);
  });

  it('최솟값 아래로 내려가지 않는다', () => {
    expect(dotRadius(0, 10)).toBe(4);
    expect(dotRadius(1, 0)).toBe(4);
  });
});
