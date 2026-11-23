// GPS는 이 파일 밖으로 반올림된 값만 나간다(roundCoord).

export type ImageMetadata = Record<string, unknown>;

export interface PhotoMetadataFields {
  width: number | null;
  height: number | null;
  // 벽시계 시각을 UTC 자리에 적은 ISO 문자열.
  taken_at: string | null;
  camera: string | null;
  lens: string | null;
  focal_length: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
}

// 소수점 한 자리(약 11km, 개인정보). 이보다 정밀한 좌표는 만들지 않는다.
export interface RoundedCoord {
  lat: number;
  lng: number;
}

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed : null;
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

// 모델이 제조사를 이미 품고 있으면 한 번만 적는다("Canon Canon EOS 200D" 방지).
export function parseCamera(make: unknown, model: unknown): string | null {
  const m = text(make);
  const mo = text(model);
  if (!mo) return m;
  if (!m) return mo;
  // 법인명이 붙는 제조사("NIKON CORPORATION")도 첫 단어로 비교한다.
  const brand = m.split(' ')[0].toLowerCase();
  if (mo.toLowerCase().startsWith(brand)) return mo;
  return `${m} ${mo}`;
}

export function parseLens(value: unknown): string | null {
  return text(value);
}

export function parseFocalLength(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(?:mm)?$/i);
  if (!match) return null;
  const mm = Number(match[1]);
  return mm > 0 ? `${trimNumber(mm)}mm` : null;
}

export function parseAperture(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(?:f\/?)?(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const f = Number(match[1]);
  return f > 0 ? `f/${trimNumber(f)}` : null;
}

export function parseShutter(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    if (num <= 0 || den <= 0) return null;
    if (num >= den) return `${trimNumber(num / den)}s`;
    // "10/1250" 같은 분자도 온다 — 1/n으로 줄인다.
    return num === 1 ? `1/${den}` : `1/${Math.round(den / num)}`;
  }
  const seconds = raw.match(/^(\d+(?:\.\d+)?)\s*s?$/i);
  if (!seconds) return null;
  const s = Number(seconds[1]);
  if (!(s > 0)) return null;
  if (s >= 1) return `${trimNumber(s)}s`;
  return `1/${Math.round(1 / s)}`;
}

export function parseIso(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d+)/);
  if (!match) return null;
  const iso = Number(match[1]);
  return iso > 0 && iso <= 10_000_000 ? iso : null;
}

// 시간대를 붙이지 않는다: 카메라 벽시계 시각을 UTC 자리에 적고, 읽는 쪽은 UTC로 포맷한다.
export function parseTakenAt(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = match;
  const year = Number(y);
  if (year < 1826 || year > 2100) return null;
  const ms = Date.UTC(year, Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  const date = new Date(ms);
  // Date.UTC는 2월 31일을 3월 3일로 넘긴다. 넘어갔으면 원래 값이 틀린 것이다.
  if (date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date.toISOString();
}

// 반올림하지 않은 값이다 — 저장·응답 전에 반드시 roundCoord를 거친다.
export function parseGpsCoordinate(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const hemisphere = raw.match(/([NSEW])\s*$/i)?.[1]?.toUpperCase();
  const numbers = raw.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!numbers || numbers.length === 0 || numbers.length > 3) return null;
  const [deg, min = 0, sec = 0] = numbers;
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return null;
  let decimal = Math.abs(deg) + min / 60 + sec / 3600;
  if (deg < 0 || hemisphere === 'S' || hemisphere === 'W') decimal = -decimal;
  return Number.isFinite(decimal) ? decimal : null;
}

export function roundCoordValue(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundCoord(lat: number, lng: number): RoundedCoord | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // (0, 0)은 GPS가 잡히기 전의 값으로 흔히 기록된다.
  if (lat === 0 && lng === 0) return null;
  return { lat: roundCoordValue(lat), lng: roundCoordValue(lng) };
}

export function parseGps(metadata: ImageMetadata): RoundedCoord | null {
  const lat = parseGpsCoordinate(metadata.GPSLatitude);
  const lng = parseGpsCoordinate(metadata.GPSLongitude);
  if (lat === null || lng === null) return null;
  return roundCoord(lat, lng);
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

export function normalizeResource(resource: {
  width?: unknown;
  height?: unknown;
  image_metadata?: unknown;
}): { fields: PhotoMetadataFields; gps: RoundedCoord | null; hasLocation: boolean } {
  const metadata: ImageMetadata =
    typeof resource.image_metadata === 'object' && resource.image_metadata !== null
      ? (resource.image_metadata as ImageMetadata)
      : {};
  return {
    fields: {
      width: positiveInt(resource.width),
      height: positiveInt(resource.height),
      taken_at: parseTakenAt(metadata.DateTimeOriginal ?? metadata.CreateDate),
      camera: parseCamera(metadata.Make, metadata.Model),
      lens: parseLens(metadata.LensModel ?? metadata.Lens),
      focal_length: parseFocalLength(metadata.FocalLength),
      aperture: parseAperture(metadata.FNumber),
      shutter: parseShutter(metadata.ExposureTime),
      iso: parseIso(metadata.ISO),
    },
    gps: parseGps(metadata),
    hasLocation: hasLocationMetadata(metadata),
  };
}

// 서버는 지우지 않고 표시만 한다. XMP·IPTC 도시·세부 위치도 보고, 나라 이름은 보지 않는다.
const LOCATION_KEY_RE =
  /^(?:GPS(?:Latitude|Longitude|Position|Coordinates|Altitude)|City|Sub-?location|Location(?:Created|Shown)?|State|Province-?State)$/i;

export function hasLocationMetadata(metadata: ImageMetadata): boolean {
  return Object.entries(metadata).some(([key, value]) => LOCATION_KEY_RE.test(key) && text(value) !== null);
}

export function hasExif(fields: PhotoMetadataFields): boolean {
  return Boolean(
    fields.taken_at || fields.camera || fields.lens || fields.focal_length || fields.aperture || fields.shutter || fields.iso,
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 이름은 호출하는 쪽이 다듬어 넘긴다 — places의 키가 photos.location과 같아야 한다.
export function groupCoordsByPlace(
  entries: Iterable<{ place: string | null | undefined; coord: RoundedCoord | null | undefined }>,
): Map<string, RoundedCoord[]> {
  const groups = new Map<string, RoundedCoord[]>();
  for (const { place, coord } of entries) {
    if (!place || !coord) continue;
    groups.set(place, [...(groups.get(place) ?? []), coord]);
  }
  return groups;
}

export function placeFromCoords(coords: readonly RoundedCoord[]): RoundedCoord | null {
  if (coords.length === 0) return null;
  return roundCoord(median(coords.map(c => c.lat)), median(coords.map(c => c.lng)));
}
