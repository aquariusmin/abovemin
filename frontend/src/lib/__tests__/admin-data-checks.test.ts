import { describe, expect, it } from 'vitest';
import {
  countLocations,
  findLocationVariants,
  isPlaceholderText,
  issueCount,
  locationKey,
  runDataChecks,
  type CheckAlbum,
  type CheckPhoto,
} from '@/lib/admin/data-checks';

const url = (id: string, transform = '') =>
  `https://res.cloudinary.com/dmljaqqzc/image/upload/${transform}v1/phorage/archive/${id}.jpg`;

describe('isPlaceholderText', () => {
  it('실데이터에 있는 자리표시자를 알아본다', () => {
    for (const value of ['-', '—', '', '   ', null, undefined, 'Untitled', 'N/A']) {
      expect(isPlaceholderText(value)).toBe(true);
    }
  });

  it('진짜 값은 자리표시자가 아니다', () => {
    for (const value of ['서울', 'Seoul', '-5도의 아침', 'Na']) {
      expect(isPlaceholderText(value)).toBe(false);
    }
  });
});

describe('locationKey / findLocationVariants', () => {
  it('서울과 Seoul은 같은 곳이다', () => {
    expect(locationKey('서울')).toBe(locationKey('Seoul'));
    expect(locationKey(' SEOUL ')).toBe(locationKey('서울특별시'));
  });

  it('별칭이 없어도 대소문자·공백 차이는 묶는다', () => {
    expect(locationKey('Grindelwald')).toBe(locationKey('grindelwald '));
    expect(locationKey('Lauterbrunnen')).not.toBe(locationKey('Grindelwald'));
  });

  it('표기가 둘 이상인 곳만, 많이 쓰인 표기부터', () => {
    const counts = countLocations([
      ...Array(58).fill('서울'),
      'Seoul',
      '부산',
      '-',
      '',
      'Kyoto',
      'kyoto',
      'kyoto',
    ]);
    const groups = findLocationVariants(counts);
    expect(groups).toEqual([
      { key: '교토', variants: [{ value: 'kyoto', count: 2 }, { value: 'Kyoto', count: 1 }] },
      { key: '서울', variants: [{ value: '서울', count: 58 }, { value: 'Seoul', count: 1 }] },
    ]);
  });
});

describe('runDataChecks', () => {
  const albums: CheckAlbum[] = [
    { slug: 'aus', title: 'Australia', cover: url('aus1', 'f_auto,q_auto/') },
    { slug: 'cal', title: '2027 Calendar', cover: url('aus1') }, // aus 커버를 빌려 씀
    { slug: 'korea', title: 'Korea', cover: null },
    { slug: 'swiss', title: 'Swiss', cover: url('elsewhere') },
    { slug: 'draft', title: 'Draft', cover: null, published: false },
  ];
  const photos: CheckPhoto[] = [
    { id: 1, album_slug: 'aus', src: url('aus1'), title: 'Bondi', location: 'Sydney' },
    { id: 2, album_slug: 'aus', src: url('aus2'), title: '-', location: '' },
    { id: 3, album_slug: 'korea', src: url('k1'), title: '—', location: '서울' },
    { id: 4, album_slug: 'korea', src: url('k2'), title: 'Namsan', location: 'Seoul' },
    { id: 5, album_slug: 'swiss', src: url('s1'), title: 'Eiger', location: 'Grindelwald' },
  ];

  const report = runDataChecks({
    albums,
    photos,
    products: [
      { id: 1, name: 'Placeholder', price: 0, in_stock: false },
      { id: 2, name: 'Oops', price: 0, in_stock: true },
      { id: 3, name: 'Print', price: 30000, in_stock: true },
    ],
  });

  it('앨범별 자리표시자 제목·장소를 센다', () => {
    expect(report.placeholderTitles).toEqual([
      { slug: 'aus', title: 'Australia', count: 1 },
      { slug: 'korea', title: 'Korea', count: 1 },
    ]);
    expect(report.placeholderLocations).toEqual([{ slug: 'aus', title: 'Australia', count: 1 }]);
  });

  it('빈 앨범(비공개 포함)', () => {
    expect(report.emptyAlbums.map(a => a.slug)).toEqual(['cal', 'draft']);
  });

  it('커버: 없음 / 남의 사진 / 빌려 쓴 쪽만 중복으로 — 변환이 붙어도 같은 파일로 본다', () => {
    expect(report.coverIssues).toEqual([
      { slug: 'cal', title: '2027 Calendar', problem: 'duplicate', sharedWith: ['aus'] },
      { slug: 'korea', title: 'Korea', problem: 'missing' },
      { slug: 'swiss', title: 'Swiss', problem: 'not_own' },
    ]);
  });

  it('비공개 앨범의 커버는 점검하지 않는다', () => {
    expect(report.coverIssues.some(issue => issue.slug === 'draft')).toBe(false);
  });

  it('판매 중인데 가격이 0인 상품만', () => {
    expect(report.unpricedProducts).toEqual([{ id: 2, name: 'Oops' }]);
  });

  it('장소 표기 묶음과 전체 개수', () => {
    expect(report.locationVariants.map(g => g.key)).toEqual(['서울']);
    expect(issueCount(report)).toBe(2 + 1 + 2 + 3 + 1 + 1);
  });

  it('같은 파일이 두 앨범에 올라가 둘 다 커버로 쓰면 양쪽을 표시한다', () => {
    const shared = runDataChecks({
      albums: [
        { slug: 'a', title: 'A', cover: url('same') },
        { slug: 'b', title: 'B', cover: url('same') },
      ],
      photos: [
        { id: 1, album_slug: 'a', src: url('same'), title: 'x', location: 'y' },
        { id: 2, album_slug: 'b', src: url('same'), title: 'x', location: 'y' },
      ],
      products: [],
    });
    expect(shared.coverIssues.map(issue => [issue.slug, issue.problem])).toEqual([
      ['a', 'duplicate'],
      ['b', 'duplicate'],
    ]);
  });
});
