import { cleanCaptionField } from './caption';

/**
 * 장소 이름 ↔ 대략의 좌표. 공개 지도(`/archive`)와 관리 화면의 "장소 좌표"가
 * 같이 쓰는 순수 로직.
 *
 * 좌표는 언제나 소수점 한 자리(약 11km)다. DB(`numeric(4,1)`)가 그렇게 자르고,
 * 여기서 한 번 더 확인한다 — 이 파일을 지나 화면에 나가는 좌표가 그보다
 * 정밀할 길이 없어야 한다.
 */

export interface PlaceCoord {
  name: string;
  lat: number;
  lng: number;
}

export interface MapPlace extends PlaceCoord {
  /** 그 장소에 걸린 공개 사진 수. 지도 점의 크기. */
  count: number;
}

function toCoord(value: unknown, limit: number): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > limit) return null;
  const rounded = Math.round(n * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * DB 행 → 좌표. PostgREST는 `numeric`을 숫자로 주지만 설정에 따라 문자열로도
 * 준다. 읽지 못하는 행은 버린다.
 */
export function placeFromRow(row: { name?: unknown; lat?: unknown; lng?: unknown }): PlaceCoord | null {
  const name = typeof row.name === 'string' ? cleanCaptionField(row.name) : null;
  const lat = toCoord(row.lat, 90);
  const lng = toCoord(row.lng, 180);
  if (!name || lat === null || lng === null) return null;
  return { name, lat, lng };
}

/** 사진의 장소 표기 → 공개 화면이 쓰는 이름. 필터(`PhotoFilter`)와 같은 규칙. */
export function placeName(location: string | null | undefined): string | null {
  return cleanCaptionField(location);
}

/**
 * 지도에 올릴 점. 사진이 한 장도 없는 장소, 좌표가 없는 장소는 빠진다.
 * 큰 점을 먼저 그리도록 개수가 많은 순 — 작은 점이 위에 올라와 눌린다.
 */
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

// ── 지역 ─────────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  label: string;
  /** [서, 남, 동, 북] 경위도. `null`이면 세계 전체. */
  bounds: [number, number, number, number] | null;
}

/**
 * 지도 위의 알약 칩. 사진이 실제로 있는 곳 위주로 고른 틀이다.
 * 북미는 동서 해안을 다 담고, 유럽은 스위스 두 곳이 가운데 오도록 잡았다.
 */
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

/** 점이 하나라도 있는 지역만. "전체"는 늘 남는다. */
export function availableRegions(places: readonly PlaceCoord[]): Region[] {
  return REGIONS.filter(region => !region.bounds || places.some(place => inRegion(place, region)));
}

/**
 * 화면 위에서 겹치는 점을 한 묶음으로.
 *
 * 세계 지도에서 한국의 열네 곳은 지름 30px 안에 겹친다. 겹친 채로 두면 위에
 * 그려진 작은 점("청송" 1장)의 터치 영역이 가장 큰 점("서울" 58장)을 덮어서,
 * 서울을 누르면 청송이 골라졌다(측정). 원이 겹치는 점은 묶어서 하나로 그리고,
 * 누르면 확대하거나 목록을 연다.
 *
 * 탐욕적 한 번 훑기: 사진이 많은 점부터, 이미 만든 묶음과 원이 `overlap`
 * 비율 이상 겹치면 거기에 넣는다. 묶음의 중심은 사진 수로 가중한 평균이다.
 */
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
  /** 사진이 많은 순. 첫 번째가 묶음의 이름이 된다. */
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

/**
 * 점 반지름(px). 넓이가 사진 수에 비례하도록 제곱근 척도 — 반지름을 개수에
 * 비례시키면 58장짜리 "서울"이 1장짜리의 58배가 아니라 3,364배 넓이로 보인다.
 */
export function dotRadius(count: number, max: number, { min = 4, maxRadius = 16 } = {}): number {
  if (max <= 0 || count <= 0) return min;
  return min + (maxRadius - min) * Math.sqrt(Math.min(count, max) / max);
}
