/**
 * 사진 배치를 정하는 순수 함수들. 사진을 자르지 않는다는 규칙 안에서
 * (`DESIGN.md` § Image Treatment) 칸의 모양을 사진의 비율에서 만든다.
 */

/** 저장된 크기가 없을 때 쓰는 비율(가로÷세로). 아카이브에서 가장 흔한 3:2. */
export const FALLBACK_RATIO = 1.5;

export function photoRatio(photo: { width?: number | null; height?: number | null }): number {
  return photo.width && photo.height ? photo.width / photo.height : FALLBACK_RATIO;
}

/**
 * 열 높이가 비슷해지도록 사진을 `columns`개의 열에 나눈다.
 *
 * CSS `columns`는 순서대로 흘려 넣기만 해서, 세로 사진이 몰린 열과 가로 사진이
 * 몰린 열의 끝이 사진 한 장만큼 어긋났다(홈 "최근 올라온 사진"의 왼쪽 아래
 * 빈칸). 여기서는 앞에서부터 한 장씩, 그때까지 가장 짧은 열에 놓는다 — 최신
 * 사진이 각 열의 위쪽에 오는 것은 그대로다.
 *
 * 높이는 열 폭을 1로 둔 단위다: 사진은 `1 / ratio`, 그 아래 캡션과 간격이
 * `extra`(같은 단위)다. 같은 높이면 왼쪽 열이 먼저다.
 */
export function balanceColumns<T>(
  items: readonly T[],
  columns: number,
  ratioOf: (item: T) => number,
  extra = 0,
): T[][] {
  const cols: T[][] = Array.from({ length: Math.max(1, columns) }, () => []);
  const heights = cols.map(() => 0);
  for (const item of items) {
    let target = 0;
    for (let c = 1; c < cols.length; c++) {
      if (heights[c] < heights[target] - 1e-9) target = c;
    }
    cols[target].push(item);
    const ratio = ratioOf(item);
    heights[target] += (ratio > 0 ? 1 / ratio : 1 / FALLBACK_RATIO) + extra;
  }
  return cols;
}

/**
 * 앨범 그리드에서 전체 폭으로 크게 보여 줄 사진의 인덱스.
 *
 * 같은 크기의 칸이 45장 내내 이어지는 단조로움을 끊는다. 가로 사진만 고른다 —
 * 세로 사진을 전체 폭으로 펴면 화면보다 길어진다. 첫 `start`장은 그리드로 두어
 * 첫 화면은 여전히 앨범의 훑어보기이고, 고른 사진 사이는 최소 `every`장이다.
 * 저장된 크기가 없는 사진은 비율을 모르므로 고르지 않는다.
 */
export function featureIndices(
  photos: readonly { width?: number | null; height?: number | null }[],
  { start = 9, every = 12, minRatio = 1.3 }: { start?: number; every?: number; minRatio?: number } = {},
): Set<number> {
  const picked = new Set<number>();
  let last = start - every;
  for (let i = start; i < photos.length; i++) {
    const { width, height } = photos[i];
    if (!width || !height) continue;
    // 맨 끝의 사진은 고르지 않는다: 뒤에 그리드가 남지 않으면 띠가 아니라
    // 꼬리가 된다.
    if (i - last >= every && width / height >= minRatio && photos.length - i > 3) {
      picked.add(i);
      last = i;
    }
  }
  return picked;
}

/**
 * 앨범 머리말의 한 줄: 촬영 연도의 범위와 많이 찍은 장소.
 * 예: `{ years: '2017 – 2026', places: ['Osaka', 'Kyoto', 'Fukuoka'], more: 6 }`.
 */
export function albumFacts(
  photos: readonly { year?: number | null; location?: string | null }[],
  topPlaces = 3,
): { years: string | null; places: string[]; more: number } {
  const years = photos.map(p => p.year).filter((y): y is number => typeof y === 'number' && y > 0);
  const min = years.length ? Math.min(...years) : null;
  const max = years.length ? Math.max(...years) : null;
  const yearLabel = min === null || max === null ? null : min === max ? String(min) : `${min} – ${max}`;

  const counts = new Map<string, { label: string; n: number; first: number }>();
  photos.forEach((p, i) => {
    const label = p.location?.trim();
    if (!label || label === '-' || label === '—') return;
    const key = label.toLowerCase();
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { label, n: 1, first: i });
  });
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n || a.first - b.first);
  return {
    years: yearLabel,
    places: ranked.slice(0, topPlaces).map(r => r.label),
    more: Math.max(0, ranked.length - topPlaces),
  };
}
