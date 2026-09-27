import { describe, expect, it } from 'vitest';
import {
  dropOnto,
  moveById,
  moveItem,
  rangeBetween,
  renumberChanges,
  sameIdSet,
} from '@/lib/admin/reorder';
import { suggestSlug, isValidSlug } from '@/lib/admin/slug';

describe('moveItem / moveById', () => {
  it('한 칸 위/아래', () => {
    expect(moveById([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveById([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
  });

  it('맨 앞에서 위로, 맨 뒤에서 아래로, 없는 id는 그대로', () => {
    expect(moveById([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moveById([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
    expect(moveById([1, 2, 3], 9, 1)).toEqual([1, 2, 3]);
  });

  it('원본을 바꾸지 않는다', () => {
    const list = [1, 2, 3];
    moveItem(list, 0, 2);
    expect(list).toEqual([1, 2, 3]);
  });
});

describe('dropOnto', () => {
  it('위로 끌면 대상 앞에, 아래로 끌면 대상 뒤에', () => {
    expect(dropOnto([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3]);
    expect(dropOnto([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
  });

  it('제자리 드롭은 변화 없음', () => {
    expect(dropOnto([1, 2, 3], 2, 2)).toEqual([1, 2, 3]);
  });
});

describe('rangeBetween', () => {
  const order = [10, 20, 30, 40, 50];

  it('양방향, 양 끝 포함, 화면 순서대로', () => {
    expect(rangeBetween(order, 20, 40)).toEqual([20, 30, 40]);
    expect(rangeBetween(order, 40, 20)).toEqual([20, 30, 40]);
  });

  it('기준점이 없으면 대상 하나, 대상이 없으면 빈 배열', () => {
    expect(rangeBetween(order, null, 30)).toEqual([30]);
    expect(rangeBetween(order, 99, 30)).toEqual([30]);
    expect(rangeBetween(order, 20, 99)).toEqual([]);
  });
});

describe('renumberChanges / sameIdSet', () => {
  it('바뀌는 행만, 1..n으로', () => {
    const current = new Map([
      [7, 1],
      [8, 2],
      [9, 3],
    ]);
    expect(renumberChanges([8, 7, 9], current)).toEqual([
      { id: 8, sortOrder: 1 },
      { id: 7, sortOrder: 2 },
    ]);
  });

  it('이미 맞으면 빈 배열 — 같은 요청을 다시 보내도 된다', () => {
    expect(renumberChanges([1, 2], new Map([[1, 1], [2, 2]]))).toEqual([]);
  });

  it('구멍 난 sort_order(삭제 후)도 1..n으로 메운다', () => {
    expect(renumberChanges([1, 2], new Map([[1, 1], [2, 5]]))).toEqual([{ id: 2, sortOrder: 2 }]);
  });

  it('id 집합이 정확히 같아야 한다', () => {
    expect(sameIdSet([1, 2, 3], [3, 2, 1])).toBe(true);
    expect(sameIdSet([1, 2], [1, 2, 3])).toBe(false);
    expect(sameIdSet([1, 2, 4], [1, 2, 3])).toBe(false);
  });
});

describe('suggestSlug', () => {
  it('영문 제목', () => {
    expect(suggestSlug('2027 Calendar')).toBe('2027-calendar');
    expect(suggestSlug('  New York — Night  ')).toBe('new-york-night');
    expect(suggestSlug('Zürich & Bern')).toBe('zurich-bern');
  });

  it('한글은 옮기지 않고 뺀다', () => {
    expect(suggestSlug('제주')).toBe('');
    expect(suggestSlug('제주 2024')).toBe('2024');
  });

  it('64자에서 자르고 끝의 하이픈을 남기지 않는다', () => {
    const slug = suggestSlug(`${'a'.repeat(63)} b`);
    expect(slug).toBe('a'.repeat(63));
    expect(isValidSlug(slug)).toBe(true);
  });
});
