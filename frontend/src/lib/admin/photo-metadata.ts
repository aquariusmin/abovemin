/**
 * Cloudinary가 돌려주는 EXIF 문자열 → `photos`에 저장할 정규화된 값.
 *
 * **순수 함수만** 둔다. 네트워크와 DB는 `metadata-fill.ts`가 맡는다 — 여기는
 * 문자열 모양이 예상 밖일 때(카메라마다 다르다) 테스트로 고정해야 하는 곳이다.
 *
 * 입력은 Admin API `resources/image/upload/<public_id>?image_metadata=true`의
 * `image_metadata`. 값은 전부 문자열이다: `FNumber: "1.8"`, `ExposureTime:
 * "1/1053"`, `FocalLength: "4.0 mm"`, `GPSLatitude: "41 deg 46' 28.77\" N"`.
 *
 * GPS는 이 파일 밖으로 **반올림된 값만** 나간다(`roundCoord`). 정밀한 좌표는
 * 파싱하는 한 줄 안에서만 산다.
 */

export type ImageMetadata = Record<string, unknown>;

export interface PhotoMetadataFields {
  width: number | null;
  height: number | null;
  /** 벽시계 시각을 UTC 자리에 적은 ISO 문자열. 마이그레이션 주석 참고. */
  taken_at: string | null;
  camera: string | null;
  lens: string | null;
  focal_length: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
}

/** 소수점 한 자리(약 11km)로 반올림한 좌표. 이보다 정밀한 좌표는 만들지 않는다. */
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

/** `70.0` → `70`, `6.80` → `6.8`. 표시용이라 뒤의 0은 뜻이 없다. */
function trimNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * 제조사 + 모델. 모델 이름이 제조사를 이미 품고 있으면 한 번만 적는다:
 * Canon은 `Make: "Canon"`, `Model: "Canon EOS 200D"`라 이어 붙이면
 * "Canon Canon EOS 200D"가 된다. SONY는 모델에 제조사가 없다("ILCE-7RM3").
 */
export function parseCamera(make: unknown, model: unknown): string | null {
  const m = text(make);
  const mo = text(model);
  if (!mo) return m;
  if (!m) return mo;
  // "NIKON CORPORATION" / "NIKON D750"처럼 제조사 쪽에 법인명이 붙는 경우도
  // 첫 단어로 비교한다.
  const brand = m.split(' ')[0].toLowerCase();
  if (mo.toLowerCase().startsWith(brand)) return mo;
  return `${m} ${mo}`;
}

export function parseLens(value: unknown): string | null {
  return text(value);
}

/** `"4.0 mm"` → `"4mm"`, `"126.0 mm"` → `"126mm"`. */
export function parseFocalLength(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(?:mm)?$/i);
  if (!match) return null;
  const mm = Number(match[1]);
  return mm > 0 ? `${trimNumber(mm)}mm` : null;
}

/** `"1.8"` → `"f/1.8"`, `"5.0"` → `"f/5"`. */
export function parseAperture(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(?:f\/?)?(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const f = Number(match[1]);
  return f > 0 ? `f/${trimNumber(f)}` : null;
}

/**
 * 셔터 속도. 1초 미만은 분수(`"1/1053"`), 1초 이상은 초(`"2s"`).
 *
 * Cloudinary는 대개 `"1/160"`처럼 분수로 주지만, 긴 노출은 `"15"`, `"1"`처럼
 * 정수로, 가끔은 `"0.5"`처럼 소수로 온다. 소수는 사진가가 읽는 모양(1/2)으로
 * 바꾼다.
 */
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

/** `"20"` → 20. `"100, 100"`처럼 두 번 적힌 값은 앞의 것. */
export function parseIso(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^(\d+)/);
  if (!match) return null;
  const iso = Number(match[1]);
  return iso > 0 && iso <= 10_000_000 ? iso : null;
}

/**
 * `"2019:07:31 14:55:19"` → `"2019-07-31T14:55:19.000Z"`.
 *
 * **시간대를 붙이지 않는다.** EXIF 시각은 카메라 시계의 벽시계 시각이고,
 * `OffsetTimeOriginal`이 있어도 믿을 수 없다 — 한국 시간(+09:00)에 맞춰 둔
 * 카메라로 호주에서 찍은 사진이 실제로 있다. 없는 정보를 지어내는 대신 벽시계
 * 시각을 UTC 자리에 그대로 적고, 읽는 쪽은 항상 UTC로 포맷한다. 그러면 적어도
 * "카메라가 가리킨 날짜"는 하루도 밀리지 않는다.
 *
 * `"0000:00:00 00:00:00"`(시계를 맞춘 적 없는 카메라)과 달력에 없는 날짜는 null.
 */
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

/**
 * `41 deg 46' 28.77" N` → 41.774…, `77 deg 26' 44.50" W` → -77.44…
 *
 * 소수 표기(`"41.7746"`, `"-77.4457"`)도 받는다. 방위 글자가 없으면 부호를 따른다.
 * **반올림하지 않은 값**을 돌려주므로, 이 함수의 결과를 저장하거나 응답에 싣지
 * 않는다 — 반드시 `roundCoord`를 거친다.
 */
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

/** 소수점 한 자리. `-0`은 `0`으로. */
export function roundCoordValue(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundCoord(lat: number, lng: number): RoundedCoord | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // (0, 0)은 GPS가 잡히기 전의 값으로 흔히 기록된다 — 기니만 한가운데.
  if (lat === 0 && lng === 0) return null;
  return { lat: roundCoordValue(lat), lng: roundCoordValue(lng) };
}

/** 위도·경도 문자열 한 쌍 → 반올림된 좌표. 어느 쪽이든 읽지 못하면 null. */
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

/**
 * Admin API의 자산 응답 하나 → 저장할 필드와 (반올림된) 좌표.
 *
 * 필드가 전부 null이어도 괜찮다 — 스캔본이나 편집 앱을 거친 사진은 EXIF가
 * 비어 있다. 그래도 `width`/`height`는 자산 자체에서 온다.
 */
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

/**
 * 원본의 메타데이터에 위치 정보가 **남아 있는가**. 업로드 화면과 CLI는 올리기
 * 전에 지우므로(`lib/exif-strip.ts`) 새 사진은 false여야 한다. true면 이 화면을
 * 거치지 않고(콘솔 등) 올라온 원본이다 — 서버는 지우지 않고 표시만 한다.
 *
 * GPS 좌표뿐 아니라 XMP·IPTC의 도시·세부 위치도 본다. 나라 이름은 보지 않는다
 * (`exif-strip.ts`의 XMP 규칙과 같다). 값이 빈 키는 없는 것으로 친다.
 */
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

/**
 * 장소 이름별로 모인 좌표 → 장소 하나의 대표 좌표.
 *
 * 평균이 아니라 **중앙값**: "서울" 58장 중 한 장이 공항에서 GPS를 잘못 잡으면
 * 평균은 서해로 끌려가지만, 중앙값은 움직이지 않는다. 위도와 경도를 따로
 * 고른다 — 11km 격자에서는 그 차이가 보이지 않는다.
 */
/**
 * (장소 이름, 반올림된 좌표) 목록 → 장소별 좌표 묶음. 이름이 비었거나 좌표가
 * 없는 항목은 뺀다. 이름은 호출하는 쪽이 공개 화면과 같은 모양으로 다듬어
 * 넘긴다(`cleanCaptionField`) — `places`의 키가 `photos.location`과 같아야 한다.
 */
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
