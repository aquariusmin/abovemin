import { describe, expect, it } from 'vitest';
import { groupTimeline, monthDayLabel, UNKNOWN_DATE_LABEL, UNKNOWN_YEAR_LABEL } from '@/lib/timeline';
import { onThisDay, seoulToday } from '@/lib/on-this-day';
import { cameraArchiveHref, cameraOptions, matchesCamera } from '@/lib/camera';

/**
 * 이 파일이 지키는 것: 아카이브를 가로지르는 세 보기(타임라인, 몇 년 전 오늘,
 * 카메라)가 날짜를 **찍은 곳의 날짜**로 읽고, 빈 값을 지어내지 않는다.
 */

describe('groupTimeline()', () => {
  const photos = [
    { id: 1, year: 2025, taken_at: '2025-08-21T10:00:00+00:00' },
    { id: 2, year: 2025, taken_at: '2025-08-21T12:00:00+00:00' },
    { id: 3, year: 2025, taken_at: '2025-02-16T09:00:00+00:00' },
    { id: 4, year: 2025, taken_at: null },
    { id: 5, year: 2019, taken_at: '2019-07-31T14:55:19.000Z' },
    { id: 6, year: 2026, taken_at: '2026-01-03T00:00:00+00:00' },
    { id: 7, year: 0, taken_at: null },
  ];
  const years = groupTimeline(photos);

  it('연도는 최신이 위, 연도 미상은 맨 끝', () => {
    expect(years.map(y => y.label)).toEqual(['2026', '2025', '2019', UNKNOWN_YEAR_LABEL]);
    expect(years.map(y => y.anchor)).toEqual(['y2026', 'y2025', 'y2019', 'y-unknown']);
  });

  it('달은 최신이 위, 날짜 미상은 그 해의 끝에 모인다', () => {
    const y2025 = years[1];
    expect(y2025.months.map(m => m.label)).toEqual(['2025년 8월', '2025년 2월', UNKNOWN_DATE_LABEL]);
    expect(y2025.months.at(-1)!.photos.map(p => p.id)).toEqual([4]);
    expect(y2025.count).toBe(4);
  });

  it('달 안에서도 최신이 위', () => {
    expect(years[1].months[0].photos.map(p => p.id)).toEqual([2, 1]);
  });

  it('UTC로 읽는다 — 12월 31일 밤 사진이 보는 사람의 시간대로 해를 넘기지 않는다', () => {
    const [only] = groupTimeline([{ id: 9, year: 2023, taken_at: '2023-12-31T23:30:00Z' }]);
    expect(only.label).toBe('2023');
    expect(only.months[0].label).toBe('2023년 12월');
  });

  it('촬영일이 year와 어긋나면 촬영일을 믿는다', () => {
    const [only] = groupTimeline([{ id: 9, year: 2020, taken_at: '2021-04-01T00:00:00Z' }]);
    expect(only.label).toBe('2021');
  });

  it('읽을 수 없는 촬영일은 없는 것으로 본다', () => {
    const [only] = groupTimeline([{ id: 9, year: 2022, taken_at: 'nope' }]);
    expect(only.months[0].label).toBe(UNKNOWN_DATE_LABEL);
  });

  it('monthDayLabel', () => {
    expect(monthDayLabel('2025-09-19T23:59:00Z')).toBe('9월 19일');
    expect(monthDayLabel(null)).toBeNull();
  });
});

describe('seoulToday()', () => {
  it('서버 시계(UTC)가 아니라 서울 날짜', () => {
    // UTC 9월 16일 20시 = 서울 9월 17일 05시.
    expect(seoulToday(new Date('2026-09-16T20:00:00Z'))).toEqual({ year: 2026, month: 9, day: 17 });
    expect(seoulToday(new Date('2026-12-31T15:00:00Z'))).toEqual({ year: 2027, month: 1, day: 1 });
  });
});

describe('onThisDay()', () => {
  const today = { year: 2026, month: 9, day: 17 };

  it('같은 월·일이 있으면 그것만, exact', () => {
    const result = onThisDay(
      [
        { id: 1, taken_at: '2024-09-17T08:00:00Z' },
        { id: 2, taken_at: '2023-09-18T08:00:00Z' },
      ],
      today,
    );
    expect(result.exact).toBe(true);
    expect(result.memories).toEqual([{ photo: { id: 1, taken_at: '2024-09-17T08:00:00Z' }, yearsAgo: 2, exact: true }]);
  });

  it('없으면 앞뒤 사흘까지 넓히고, 그 밖은 뺀다', () => {
    const result = onThisDay(
      [
        { id: 1, taken_at: '2020-09-19T08:00:00Z' },
        { id: 2, taken_at: '2025-09-14T08:00:00Z' },
        { id: 3, taken_at: '2025-09-21T08:00:00Z' },
        { id: 4, taken_at: null },
      ],
      today,
    );
    expect(result.exact).toBe(false);
    expect(result.memories.map(m => [m.photo.id, m.yearsAgo, m.exact])).toEqual([
      [2, 1, false],
      [1, 6, false],
    ]);
  });

  it('올해 찍은 사진은 "몇 년 전"이 아니다', () => {
    expect(onThisDay([{ id: 1, taken_at: '2026-09-17T08:00:00Z' }], today).memories).toEqual([]);
  });

  it('해가 바뀌는 경계: 1월 1일에 보는 12월 30일 사진은 1년 전 이맘때', () => {
    const result = onThisDay([{ id: 1, taken_at: '2025-12-30T08:00:00Z' }], { year: 2027, month: 1, day: 1 });
    expect(result.memories.map(m => m.yearsAgo)).toEqual([1]);
    // 반대 방향: 12월 30일에 보는 올해 1월 1일 사진은 달력 연도가 같아도 "1년 전".
    const back = onThisDay([{ id: 1, taken_at: '2026-01-01T08:00:00Z' }], { year: 2026, month: 12, day: 30 });
    expect(back.memories.map(m => m.yearsAgo)).toEqual([1]);
  });

  it('2월 29일 사진은 평년의 2월 28일에 하루 거리', () => {
    const result = onThisDay([{ id: 1, taken_at: '2024-02-29T08:00:00Z' }], { year: 2027, month: 2, day: 28 });
    expect(result.memories.map(m => [m.yearsAgo, m.exact])).toEqual([[3, false]]);
  });

  it('한 해가 독차지하지 않게 연도를 번갈아 고른다', () => {
    const burst = Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, taken_at: `2025-09-17T08:0${i}:00Z` }));
    const result = onThisDay([...burst, { id: 1, taken_at: '2019-09-17T08:00:00Z' }], today, { limit: 4 });
    expect(result.memories).toHaveLength(4);
    expect(result.memories.map(m => m.yearsAgo)).toEqual([1, 1, 1, 7]);
  });
});

describe('camera', () => {
  const photos = [
    { camera: 'SONY ILCE-7RM3' },
    { camera: 'Apple iPhone 15 Pro Max' },
    { camera: 'SONY ILCE-7RM3' },
    { camera: null },
    { camera: ' - ' },
  ];

  it('선택지는 많은 순, 이름은 줄이되 값은 저장된 그대로', () => {
    expect(cameraOptions(photos)).toEqual([
      { value: 'SONY ILCE-7RM3', label: 'SONY ILCE-7RM3', count: 2 },
      { value: 'Apple iPhone 15 Pro Max', label: 'iPhone 15 Pro Max', count: 1 },
    ]);
  });

  it('matchesCamera', () => {
    expect(matchesCamera({ camera: ' SONY ILCE-7RM3 ' }, 'SONY ILCE-7RM3')).toBe(true);
    expect(matchesCamera({ camera: null }, 'SONY ILCE-7RM3')).toBe(false);
  });

  it('링크는 인코딩된 쿼리와 필터 섹션 앵커', () => {
    const href = cameraArchiveHref('Apple iPhone 15 Pro Max');
    expect(href).toBe('/archive?camera=Apple+iPhone+15+Pro+Max#archive-search');
    expect(new URL(href, 'https://x.y').searchParams.get('camera')).toBe('Apple iPhone 15 Pro Max');
  });
});
