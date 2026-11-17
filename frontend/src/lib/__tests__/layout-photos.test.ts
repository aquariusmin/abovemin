import { describe, expect, it } from 'vitest';
import { albumFacts, balanceColumns, featureIndices, photoRatio } from '@/lib/layout-photos';

const ratio = (r: number) => ({ width: Math.round(r * 1000), height: 1000 });

describe('balanceColumns', () => {
  it('가장 짧은 열에 다음 사진을 놓아 끝을 맞춘다', () => {
    // 세로(0.5) 하나 뒤에 가로(2) 셋: 순서대로 흘리면 [세로, 가로] [가로, 가로].
    const items = [ratio(0.5), ratio(2), ratio(2), ratio(2)];
    const cols = balanceColumns(items, 2, photoRatio);
    // 세로 한 장(높이 2) 옆에 가로 셋(0.5 × 3 = 1.5)이 쌓인다.
    expect(cols[0]).toEqual([items[0]]);
    expect(cols[1]).toEqual([items[1], items[2], items[3]]);
  });

  it('열 안의 순서는 원래 순서를 지킨다', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i, ...ratio(1 + (i % 3) * 0.3) }));
    for (const col of balanceColumns(items, 3, photoRatio)) {
      const ids = col.map(c => c.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    }
  });

  it('모든 사진이 한 번씩 들어간다', () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ id: i, ...ratio(0.7 + (i % 4) * 0.4) }));
    const flat = balanceColumns(items, 4, photoRatio).flat().map(i => i.id).sort((a, b) => a - b);
    expect(flat).toEqual(items.map(i => i.id));
  });

  it('크기를 모르는 사진은 3:2로 센다', () => {
    expect(photoRatio({ width: null, height: null })).toBe(1.5);
  });
});

describe('featureIndices', () => {
  it('앞쪽은 건너뛰고, 가로 사진만, 간격을 두고 고른다', () => {
    const photos = Array.from({ length: 40 }, () => ratio(1.5));
    expect([...featureIndices(photos)]).toEqual([9, 21, 33]);
  });

  it('세로 사진과 크기 없는 사진은 고르지 않는다', () => {
    const photos = [
      ...Array.from({ length: 9 }, () => ratio(1.5)),
      ratio(0.66),
      { width: null, height: null },
      ratio(1.5),
      ...Array.from({ length: 10 }, () => ratio(0.8)),
    ];
    expect([...featureIndices(photos)]).toEqual([11]);
  });

  it('맨 끝 몇 장은 고르지 않는다', () => {
    const photos = Array.from({ length: 12 }, () => ratio(1.5));
    expect([...featureIndices(photos)]).toEqual([]);
  });
});

describe('albumFacts', () => {
  it('연도 범위와 많이 찍은 장소를 센다', () => {
    const facts = albumFacts([
      { year: 2019, location: 'Kyoto' },
      { year: 2017, location: 'Osaka' },
      { year: 2026, location: 'osaka' },
      { year: 2025, location: 'Fukuoka' },
      { year: 2025, location: '-' },
      { year: 2025, location: 'Nagano' },
    ]);
    expect(facts).toEqual({ years: '2017 – 2026', places: ['Osaka', 'Kyoto', 'Fukuoka'], more: 1 });
  });

  it('한 해뿐이면 범위가 아니라 그 해다', () => {
    expect(albumFacts([{ year: 2025, location: null }]).years).toBe('2025');
    expect(albumFacts([]).years).toBeNull();
  });
});
