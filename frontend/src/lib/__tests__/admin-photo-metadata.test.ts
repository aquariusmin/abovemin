import { describe, expect, it } from 'vitest';
import {
  hasExif,
  normalizeResource,
  parseAperture,
  parseCamera,
  parseFocalLength,
  parseGps,
  parseGpsCoordinate,
  parseIso,
  parseShutter,
  parseTakenAt,
  placeFromCoords,
  roundCoord,
} from '@/lib/admin/photo-metadata';

/**
 * 이 파일이 지키는 것: 카메라마다 다른 EXIF 문자열이 한 가지 표시 형식으로
 * 모이고, **정밀한 GPS가 반올림을 거치지 않고 밖으로 나가는 경로가 없다.**
 * 입력 문자열은 2026-09-16 Cloudinary Admin API 응답에서 그대로 옮겼다.
 */

describe('parseCamera', () => {
  it('제조사와 모델을 잇는다', () => {
    expect(parseCamera('Apple', 'iPhone 7')).toBe('Apple iPhone 7');
    expect(parseCamera('SONY', 'ILCE-7RM3')).toBe('SONY ILCE-7RM3');
    expect(parseCamera('Apple', 'iPod touch')).toBe('Apple iPod touch');
  });

  it('모델이 제조사를 이미 품고 있으면 한 번만 적는다', () => {
    expect(parseCamera('Canon', 'Canon EOS 200D')).toBe('Canon EOS 200D');
    expect(parseCamera('NIKON CORPORATION', 'NIKON D750')).toBe('NIKON D750');
  });

  it('한쪽만 있으면 그쪽, 둘 다 없으면 null', () => {
    expect(parseCamera(undefined, 'X100V')).toBe('X100V');
    expect(parseCamera('FUJIFILM', '')).toBe('FUJIFILM');
    expect(parseCamera(undefined, '  ')).toBeNull();
  });
});

describe('parseFocalLength', () => {
  it('"4.0 mm" → "4mm"', () => {
    expect(parseFocalLength('4.0 mm')).toBe('4mm');
    expect(parseFocalLength('126.0 mm')).toBe('126mm');
    expect(parseFocalLength('6.8 mm')).toBe('6.8mm');
    expect(parseFocalLength('15.66mm')).toBe('15.66mm');
  });

  it('읽을 수 없거나 0이면 null', () => {
    expect(parseFocalLength('0.0 mm')).toBeNull();
    expect(parseFocalLength('unknown')).toBeNull();
    expect(parseFocalLength(undefined)).toBeNull();
  });
});

describe('parseAperture', () => {
  it('f/ 표기로 모은다', () => {
    expect(parseAperture('1.8')).toBe('f/1.8');
    expect(parseAperture('5.0')).toBe('f/5');
    expect(parseAperture('f/2.8')).toBe('f/2.8');
  });

  it('0이나 문자는 null', () => {
    expect(parseAperture('0')).toBeNull();
    expect(parseAperture('auto')).toBeNull();
  });
});

describe('parseShutter', () => {
  it('1초 미만은 분수', () => {
    expect(parseShutter('1/1053')).toBe('1/1053');
    expect(parseShutter('1/160')).toBe('1/160');
    expect(parseShutter('0.5')).toBe('1/2');
    expect(parseShutter('10/1250')).toBe('1/125');
  });

  it('1초 이상은 초', () => {
    expect(parseShutter('1')).toBe('1s');
    expect(parseShutter('15')).toBe('15s');
    expect(parseShutter('2.5')).toBe('2.5s');
    expect(parseShutter('4/2')).toBe('2s');
  });

  it('읽을 수 없으면 null', () => {
    expect(parseShutter('0')).toBeNull();
    expect(parseShutter('1/0')).toBeNull();
    expect(parseShutter('bulb')).toBeNull();
  });
});

describe('parseIso', () => {
  it('정수로', () => {
    expect(parseIso('20')).toBe(20);
    expect(parseIso('12800')).toBe(12800);
    expect(parseIso('100, 100')).toBe(100);
    expect(parseIso('0')).toBeNull();
    expect(parseIso('')).toBeNull();
  });
});

describe('parseTakenAt', () => {
  it('벽시계 시각을 UTC 자리에 그대로 적는다 — 시간대를 지어내지 않는다', () => {
    expect(parseTakenAt('2019:07:31 14:55:19')).toBe('2019-07-31T14:55:19.000Z');
    // 늦은 밤 사진이 UTC 변환으로 다음 날/전날로 밀리지 않는다.
    expect(parseTakenAt('2023:08:04 22:05:55')).toBe('2023-08-04T22:05:55.000Z');
  });

  it('날짜만 있어도 받는다', () => {
    expect(parseTakenAt('2025:12:25')).toBe('2025-12-25T00:00:00.000Z');
  });

  it('시계를 맞춘 적 없는 카메라나 달력에 없는 날짜는 null', () => {
    expect(parseTakenAt('0000:00:00 00:00:00')).toBeNull();
    expect(parseTakenAt('2019:02:31 10:00:00')).toBeNull();
    expect(parseTakenAt('garbage')).toBeNull();
  });
});

describe('GPS', () => {
  it('도·분·초와 방위를 부호 있는 십진수로', () => {
    expect(parseGpsCoordinate(`41 deg 46' 28.77" N`)).toBeCloseTo(41.7747, 3);
    expect(parseGpsCoordinate(`140 deg 45' 41.91" E`)).toBeCloseTo(140.7616, 3);
    expect(parseGpsCoordinate(`38 deg 39' 51.35" S`)).toBeCloseTo(-38.6643, 3);
    expect(parseGpsCoordinate(`77 deg 26' 44.50" W`)).toBeCloseTo(-77.4457, 3);
    expect(parseGpsCoordinate('-33.79')).toBeCloseTo(-33.79, 5);
  });

  it('범위를 벗어난 분·초나 빈 값은 null', () => {
    expect(parseGpsCoordinate(`41 deg 61' 0" N`)).toBeNull();
    expect(parseGpsCoordinate('')).toBeNull();
    expect(parseGpsCoordinate(undefined)).toBeNull();
  });

  it('밖으로 나가는 좌표는 언제나 소수점 한 자리다', () => {
    const coord = parseGps({ GPSLatitude: `41 deg 46' 28.77" N`, GPSLongitude: `140 deg 45' 41.91" E` });
    expect(coord).toEqual({ lat: 41.8, lng: 140.8 });
    for (const value of Object.values(coord!)) {
      expect(Math.round(value * 10) / 10).toBe(value);
    }
  });

  it('한쪽이 없거나 (0, 0)이거나 범위를 벗어나면 좌표가 없다', () => {
    expect(parseGps({ GPSLatitude: `41 deg 46' 28.77" N` })).toBeNull();
    expect(parseGps({})).toBeNull();
    expect(roundCoord(0, 0)).toBeNull();
    expect(roundCoord(91, 10)).toBeNull();
    expect(roundCoord(-0.04, 10)).toEqual({ lat: 0, lng: 10 });
  });
});

describe('normalizeResource', () => {
  it('Admin API 응답 하나를 저장할 필드로', () => {
    const { fields, gps } = normalizeResource({
      width: 1500,
      height: 1124,
      image_metadata: {
        Make: 'Apple',
        Model: 'iPhone 7',
        LensModel: 'iPhone 7 back camera 3.99mm f/1.8',
        FNumber: '1.8',
        ExposureTime: '1/1053',
        ISO: '20',
        FocalLength: '4.0 mm',
        DateTimeOriginal: '2019:07:31 14:55:19',
        GPSLatitude: `41 deg 46' 28.77" N`,
        GPSLongitude: `140 deg 45' 41.91" E`,
      },
    });
    expect(fields).toEqual({
      width: 1500,
      height: 1124,
      taken_at: '2019-07-31T14:55:19.000Z',
      camera: 'Apple iPhone 7',
      lens: 'iPhone 7 back camera 3.99mm f/1.8',
      focal_length: '4mm',
      aperture: 'f/1.8',
      shutter: '1/1053',
      iso: 20,
    });
    expect(gps).toEqual({ lat: 41.8, lng: 140.8 });
    // 저장할 필드에는 좌표가 섞여 들어가지 않는다 — photos는 공개 테이블이다.
    expect(Object.keys(fields).some(key => /lat|lng|gps/i.test(key))).toBe(false);
  });

  it('EXIF가 없는 자산도 크기는 남긴다', () => {
    const { fields, gps } = normalizeResource({ width: 724, height: 1086 });
    expect(fields.width).toBe(724);
    expect(fields.height).toBe(1086);
    expect(hasExif(fields)).toBe(false);
    expect(gps).toBeNull();
  });
});

describe('placeFromCoords', () => {
  it('중앙값이라 튀는 한 장에 끌려가지 않는다', () => {
    const seoul = { lat: 37.5, lng: 127.0 };
    const coords = [seoul, seoul, { lat: 37.6, lng: 126.9 }, { lat: 37.4, lng: 127.1 }, { lat: 33.5, lng: 126.5 }];
    expect(placeFromCoords(coords)).toEqual({ lat: 37.5, lng: 127.0 });
  });

  it('짝수 개면 가운데 둘의 평균을 다시 반올림한다', () => {
    expect(placeFromCoords([{ lat: 35.0, lng: 135.7 }, { lat: 35.1, lng: 135.8 }])).toEqual({ lat: 35.1, lng: 135.8 });
    expect(placeFromCoords([])).toBeNull();
  });
});
