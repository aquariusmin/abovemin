// 저장된 크기가 없을 때 쓰는 비율(가로÷세로). 아카이브에서 가장 흔한 3:2.
export const FALLBACK_RATIO = 1.5;

export function photoRatio(photo: { width?: number | null; height?: number | null }): number {
  return photo.width && photo.height ? photo.width / photo.height : FALLBACK_RATIO;
}

// 가장 짧은 열에 한 장씩 놓는다. 높이 단위는 열 폭=1: 사진 `1 / ratio` + 캡션 `extra`.
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

// 가로 사진만 고른다 — 세로 사진을 전체 폭으로 펴면 화면보다 길어진다.
export function featureIndices(
  photos: readonly { width?: number | null; height?: number | null }[],
  { start = 9, every = 12, minRatio = 1.3 }: { start?: number; every?: number; minRatio?: number } = {},
): Set<number> {
  const picked = new Set<number>();
  let last = start - every;
  for (let i = start; i < photos.length; i++) {
    const { width, height } = photos[i];
    if (!width || !height) continue;
    // 맨 끝 사진은 고르지 않는다 — 뒤에 그리드가 남지 않으면 꼬리가 된다.
    if (i - last >= every && width / height >= minRatio && photos.length - i > 3) {
      picked.add(i);
      last = i;
    }
  }
  return picked;
}

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
