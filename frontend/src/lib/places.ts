import { cleanCaptionField } from './caption';

// 좌표는 언제나 소수점 한 자리(약 11km) — 이보다 정밀한 좌표가 화면에 나가면 안 된다.
export interface PlaceCoord {
  name: string;
  lat: number;
  lng: number;
}

export interface MapPlace extends PlaceCoord {
  count: number;
}

function toCoord(value: unknown, limit: number): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > limit) return null;
  const rounded = Math.round(n * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// PostgREST는 `numeric`을 설정에 따라 문자열로도 준다.
export function placeFromRow(row: { name?: unknown; lat?: unknown; lng?: unknown }): PlaceCoord | null {
  const name = typeof row.name === 'string' ? cleanCaptionField(row.name) : null;
  const lat = toCoord(row.lat, 90);
  const lng = toCoord(row.lng, 180);
  if (!name || lat === null || lng === null) return null;
  return { name, lat, lng };
}

export function placeName(location: string | null | undefined): string | null {
  return cleanCaptionField(location);
}

// 큰 점을 먼저 그리도록 개수가 많은 순.
export function buildMapPlaces(
  photos: ReadonlyArray<{ location?: string | null }>,
  places: readonly PlaceCoord[],
): MapPlace[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    const name = placeName(photo.location);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return places
    .filter(place => counts.has(place.name))
    .map(place => ({ ...place, count: counts.get(place.name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export interface Region {
  id: string;
  label: string;
  /** [서, 남, 동, 북] 경위도. `null`이면 세계 전체. */
  bounds: [number, number, number, number] | null;
}

export const REGIONS: readonly Region[] = [
  { id: 'world', label: '전체', bounds: null },
  { id: 'korea', label: '한국', bounds: [124.5, 33, 131, 38.7] },
  { id: 'japan', label: '일본', bounds: [129, 30.5, 146, 45.6] },
  { id: 'north-america', label: '북미', bounds: [-125, 24, -66, 50] },
  { id: 'australia', label: '호주', bounds: [112, -44, 154, -10] },
  { id: 'europe', label: '유럽', bounds: [-10, 36, 30, 60] },
];

export function inRegion(place: PlaceCoord, region: Region): boolean {
  if (!region.bounds) return true;
  const [west, south, east, north] = region.bounds;
  return place.lng >= west && place.lng <= east && place.lat >= south && place.lat <= north;
}

export function availableRegions(places: readonly PlaceCoord[]): Region[] {
  return REGIONS.filter(region => !region.bounds || places.some(place => inRegion(place, region)));
}

// 겹친 점을 묶는다 — 겹친 채면 작은 점의 터치 영역이 큰 점을 덮는다. 사진 많은 점부터 탐욕적으로.
export interface ScreenDot<T> {
  item: T;
  x: number;
  y: number;
  count: number;
}

export interface DotCluster<T> {
  x: number;
  y: number;
  count: number;
  r: number;
  members: T[];
}

export function clusterDots<T>(
  dots: ReadonlyArray<ScreenDot<T>>,
  radius: (count: number) => number,
  overlap = 0.75,
): DotCluster<T>[] {
  const clusters: Array<DotCluster<T>> = [];
  for (const dot of [...dots].sort((a, b) => b.count - a.count)) {
    const r = radius(dot.count);
    const home = clusters.find(c => Math.hypot(c.x - dot.x, c.y - dot.y) < (c.r + r) * overlap);
    if (!home) {
      clusters.push({ x: dot.x, y: dot.y, count: dot.count, r, members: [dot.item] });
      continue;
    }
    const total = home.count + dot.count;
    home.x = (home.x * home.count + dot.x * dot.count) / total;
    home.y = (home.y * home.count + dot.y * dot.count) / total;
    home.count = total;
    home.r = radius(total);
    home.members.push(dot.item);
  }
  return clusters;
}

// 넓이가 사진 수에 비례하도록 제곱근 척도.
export function dotRadius(count: number, max: number, { min = 4, maxRadius = 16 } = {}): number {
  if (max <= 0 || count <= 0) return min;
  return min + (maxRadius - min) * Math.sqrt(Math.min(count, max) / max);
}
