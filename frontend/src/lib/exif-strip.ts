/**
 * 올리기 전에 사진 파일에서 위치 정보를 지운다. 관리 화면(브라우저)과
 * `scripts/add-photos.mjs`(Node)가 **같은 코드**를 쓴다.
 *
 * 왜 업로드 전에, 파일 자체에서: Cloudinary 원본은 딜리버리 URL에서 변환
 * 구간만 빼면 누구나 받을 수 있고, `photos.src`는 공개 테이블에 있다. 원본에
 * GPS가 남아 있으면 집 앞에서 찍은 사진이 곧 집 주소다. 서버에서 지우려면
 * 원본을 한 번 받아 다시 올려야 하고, 그 사이에는 이미 공개돼 있다.
 *
 * **무손실이다.** JPEG을 다시 인코딩하지 않는다. 압축된 영상 데이터(SOS부터
 * 첫 EOI까지)는 바이트 그대로 복사하고, 그 앞의 메타데이터 세그먼트만 고친다:
 *  - EXIF(APP1 `Exif\0\0`): GPS IFD의 항목과 값을 0으로 덮고, IFD0(과 IFD1)의
 *    `GPSInfo`(0x8825) 포인터 항목을 **빼낸다**. 제조사·모델·렌즈·노출·촬영일은
 *    그대로라, 저장 뒤 Cloudinary에서 읽는 촬영 정보 채우기가 계속 동작한다.
 *  - XMP(APP1 `http://ns.adobe.com/xap/1.0/`, 확장 XMP 포함): 세그먼트째 뺀다.
 *    iPhone은 XMP에도 위치를 적고, 이 사이트는 XMP에서 읽는 것이 없다.
 *  - APP13(Photoshop IRB / IPTC): 세그먼트째 뺀다. IPTC의 도시·세부 위치를
 *    골라 지우는 것보다 통째로 빼는 쪽이 짧고 틀릴 곳이 없다 — 여기서 쓰는
 *    IPTC 필드도 없다.
 *
 * 첫 EOI 뒤(MPF로 붙은 게인 맵·깊이 맵 같은 보조 이미지)는 길이를 바꾸지 않고
 * 제자리에서만 고친다. 그 안의 EXIF GPS는 같은 방법으로 비우고, 위치가 적힌
 * XMP는 공백으로 덮는다(XMP 패킷은 원래 공백으로 채우는 형식이다). 앞쪽에서
 * 세그먼트를 빼 MPF의 상대 오프셋이 어긋나면 MPF 항목을 고쳐 맞춘다.
 *
 * 이 파일은 **아무것도 import하지 않는다.** CLI가 Node의 타입 제거(type
 * stripping)로 이 파일을 직접 불러오는데, 그 경로에서는 `@/` 별칭도 확장자
 * 없는 상대 경로도 풀리지 않는다. 같은 이유로 enum·namespace처럼 지울 수
 * 없는 TS 문법도 쓰지 않는다.
 *
 * GPS는 읽는 즉시 소수점 한 자리(약 11km)로 반올림한다(`roundCoordinate`).
 * 정밀한 좌표는 `readGpsCoord` 한 함수 안에서만 산다.
 */

/** 소수점 한 자리로 반올림한 좌표. `lib/admin/photo-metadata.ts`의 `RoundedCoord`와 같은 모양. */
export interface RoundedCoord {
  lat: number;
  lng: number;
}

/** JPEG이 아니거나 구조를 믿을 수 없을 때. 호출하는 쪽이 보수적인 경로로 넘어간다. */
export class ImageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageFormatError';
  }
}

export interface JpegStripResult {
  /** 위치 정보를 뺀 파일. 입력과 버퍼를 공유하지 않는다. */
  bytes: Uint8Array<ArrayBuffer>;
  /** 위치 정보(GPS 좌표, XMP·IPTC의 장소)가 실제로 있었고 지웠다. */
  locationRemoved: boolean;
  /** EXIF GPS에서 읽은 좌표(소수점 한 자리). 없거나 읽지 못하면 null. */
  coord: RoundedCoord | null;
  /** 통째로 뺀 세그먼트 수(XMP, APP13, 읽을 수 없는 EXIF). */
  droppedSegments: number;
}

export interface LocationScan {
  /** 위치 정보가 있거나, 있을 수 있는데 확인할 수 없다(압축된 XMP 등). */
  hasLocation: boolean;
  coord: RoundedCoord | null;
  /** EXIF `DateTimeOriginal`의 연도. JPEG로 변환하면 EXIF가 사라지므로 미리 읽어 둔다. */
  takenYear: number | null;
}

// ── 좌표 ──────────────────────────────────────────────────────────────────────

/**
 * `lib/admin/photo-metadata.ts`의 `roundCoord`와 같은 규칙(테스트가 둘을 맞춰
 * 본다). 범위 밖, 숫자가 아님, (0, 0)은 null — (0, 0)은 GPS가 잡히기 전 값이다.
 */
export function roundCoordinate(lat: number, lng: number): RoundedCoord | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  const round = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  return { lat: round(lat), lng: round(lng) };
}

// ── 바이트 도구 ───────────────────────────────────────────────────────────────

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, ch => ch.charCodeAt(0));
}

const EXIF_ID = ascii('Exif\0\0');
const XMP_ID = ascii('http://ns.adobe.com/xap/1.0/\0');
const XMP_EXT_ID = ascii('http://ns.adobe.com/xmp/extension/\0');
const MPF_ID = ascii('MPF\0');
const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWithAt(bytes: Uint8Array, at: number, prefix: Uint8Array, end = bytes.length): boolean {
  if (at < 0 || at + prefix.length > end) return false;
  for (let i = 0; i < prefix.length; i++) if (bytes[at + i] !== prefix[i]) return false;
  return true;
}

function indexOfBytes(bytes: Uint8Array, needle: Uint8Array, from: number, end = bytes.length): number {
  const first = needle[0];
  for (let i = bytes.indexOf(first, from); i !== -1 && i + needle.length <= end; i = bytes.indexOf(first, i + 1)) {
    if (startsWithAt(bytes, i, needle, end)) return i;
  }
  return -1;
}

/**
 * 위치를 뜻하는 XMP 속성 이름. 바이트를 latin1로 읽어 찾으므로 UTF-8 본문
 * 안의 ASCII 이름도 그대로 걸린다. 국가(`photoshop:Country`)는 넣지 않는다 —
 * 나라 이름은 사진을 보면 아는 정도의 정보다.
 */
const XMP_LOCATION_RE =
  /GPS(?:Latitude|Longitude|Altitude|Position|Coordinates)|photoshop:(?:City|State)|Iptc4xmpCore:Location|Iptc4xmpExt:Location(?:Created|Shown)|exif:GPS/;

/** 큰 파일도 한 번에 문자열로 만들지 않도록 조각내 찾는다. 조각 경계에 걸린 이름은 겹침으로 잡는다. */
function hasXmpLocationText(bytes: Uint8Array, from = 0, end = bytes.length): boolean {
  const CHUNK = 1 << 20;
  const OVERLAP = 64;
  for (let start = from; start < end; start += CHUNK) {
    const stop = Math.min(end, start + CHUNK + OVERLAP);
    let text = '';
    // String.fromCharCode의 인자 개수 상한을 피해 작은 조각으로 잇는다.
    for (let i = start; i < stop; i += 8192) {
      text += String.fromCharCode(...bytes.subarray(i, Math.min(stop, i + 8192)));
    }
    if (XMP_LOCATION_RE.test(text)) return true;
  }
  return false;
}

/** IPTC-IIM 레코드 2의 도시(90)·세부 위치(92)·주(95). `0x1C 0x02 <dataset>` 태그로 찾는다. */
function hasIptcLocation(bytes: Uint8Array, from: number, end: number): boolean {
  for (let i = bytes.indexOf(0x1c, from); i !== -1 && i + 2 < end; i = bytes.indexOf(0x1c, i + 1)) {
    if (bytes[i + 1] === 0x02 && (bytes[i + 2] === 90 || bytes[i + 2] === 92 || bytes[i + 2] === 95)) return true;
  }
  return false;
}

// ── TIFF(EXIF) ────────────────────────────────────────────────────────────────

/** TIFF 타입 번호 → 값 하나의 바이트 수. 0은 모르는 타입. */
const TYPE_SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];

const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_MP_ENTRY = 0xb002;

/** 구조가 경계를 넘을 때 던진다. 호출부가 잡아 보수적으로 처리한다. */
class TiffBoundsError extends Error {}

interface Tiff {
  bytes: Uint8Array;
  view: DataView;
  /** TIFF 헤더(`II`/`MM`)의 절대 위치. 모든 오프셋은 여기서부터 잰다. */
  start: number;
  /** TIFF 구조가 쓸 수 있는 끝(절대 위치, 미포함). */
  end: number;
  le: boolean;
}

interface IfdEntry {
  /** 항목 12바이트의 절대 위치. */
  pos: number;
  tag: number;
  type: number;
  count: number;
  /** 값의 바이트 수. 모르는 타입이면 0. */
  size: number;
  /** 값이 4바이트 이하라 항목 안에 들어 있는가. */
  inline: boolean;
  /** 값의 TIFF 상대 오프셋(inline이면 항목 안의 값 자리). */
  valueOffset: number;
}

interface Ifd {
  offset: number;
  entries: IfdEntry[];
  next: number;
}

function openTiff(bytes: Uint8Array, start: number, end: number): Tiff | null {
  if (start < 0 || start + 8 > end || end > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let le: boolean;
  if (bytes[start] === 0x49 && bytes[start + 1] === 0x49) le = true;
  else if (bytes[start] === 0x4d && bytes[start + 1] === 0x4d) le = false;
  else return null;
  if (view.getUint16(start + 2, le) !== 42) return null;
  return { bytes, view, start, end, le };
}

function u16(t: Tiff, offset: number): number {
  const at = t.start + offset;
  if (offset < 0 || at + 2 > t.end) throw new TiffBoundsError();
  return t.view.getUint16(at, t.le);
}

function u32(t: Tiff, offset: number): number {
  const at = t.start + offset;
  if (offset < 0 || at + 4 > t.end) throw new TiffBoundsError();
  return t.view.getUint32(at, t.le);
}

function readIfd(t: Tiff, offset: number): Ifd {
  const count = u16(t, offset);
  // 실제 카메라 IFD는 수십 항목이다. 수천이면 엉뚱한 바이트를 IFD로 읽고 있는 것이다.
  if (count === 0 || count > 1000) throw new TiffBoundsError();
  const entries: IfdEntry[] = [];
  for (let i = 0; i < count; i++) {
    const rel = offset + 2 + i * 12;
    const tag = u16(t, rel);
    const type = u16(t, rel + 2);
    const n = u32(t, rel + 4);
    const unit = TYPE_SIZE[type] ?? 0;
    const size = unit * n;
    const inline = unit !== 0 && size <= 4;
    entries.push({
      pos: t.start + rel,
      tag,
      type,
      count: n,
      size,
      inline,
      valueOffset: inline ? rel + 8 : u32(t, rel + 8),
    });
  }
  return { offset, entries, next: u32(t, offset + 2 + count * 12) };
}

function rational(t: Tiff, offset: number, signed: boolean): number {
  if (offset < 0 || t.start + offset + 8 > t.end) throw new TiffBoundsError();
  const num = signed ? t.view.getInt32(t.start + offset, t.le) : u32(t, offset);
  const den = signed ? t.view.getInt32(t.start + offset + 4, t.le) : u32(t, offset + 4);
  return den === 0 ? Number.NaN : num / den;
}

/** 도·분·초 유리수 1~3개 → 도. 부호는 ref(`N`/`S`/`E`/`W`)가 정한다. */
function degrees(t: Tiff, entry: IfdEntry | undefined, ref: IfdEntry | undefined, negative: string): number {
  if (!entry || (entry.type !== 5 && entry.type !== 10) || entry.count < 1) return Number.NaN;
  const signed = entry.type === 10;
  const parts = [0, 1, 2].map(i => (i < entry.count ? rational(t, entry.valueOffset + i * 8, signed) : 0));
  const [d, m, s] = parts;
  let value = Math.abs(d) + m / 60 + s / 3600;
  const refChar = ref && ref.type === 2 && ref.count >= 1 ? String.fromCharCode(t.bytes[t.start + ref.valueOffset]) : '';
  if (d < 0 || refChar.toUpperCase() === negative) value = -value;
  return value;
}

/** GPS IFD → 반올림된 좌표. 정밀한 값은 이 함수를 벗어나지 않는다. */
function readGpsCoord(t: Tiff, gps: Ifd): RoundedCoord | null {
  const byTag = new Map(gps.entries.map(entry => [entry.tag, entry]));
  try {
    return roundCoordinate(
      degrees(t, byTag.get(2), byTag.get(1), 'S'),
      degrees(t, byTag.get(4), byTag.get(3), 'W'),
    );
  } catch {
    return null;
  }
}

function readAscii(t: Tiff, entry: IfdEntry): string {
  if (entry.type !== 2) return '';
  const at = t.start + entry.valueOffset;
  if (at + entry.count > t.end) throw new TiffBoundsError();
  let text = '';
  for (let i = 0; i < entry.count; i++) {
    const code = t.bytes[at + i];
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text;
}

function takenYearFromExifIfd(t: Tiff, ifd0: Ifd): number | null {
  try {
    const pointer = ifd0.entries.find(entry => entry.tag === TAG_EXIF_IFD);
    if (!pointer) return null;
    const exif = readIfd(t, u32(t, pointer.pos - t.start + 8));
    const original = exif.entries.find(entry => entry.tag === TAG_DATETIME_ORIGINAL);
    const match = original ? readAscii(t, original).match(/^(\d{4})[:-]/) : null;
    const year = match ? Number(match[1]) : null;
    return year && year >= 1826 && year <= 2100 ? year : null;
  } catch {
    return null;
  }
}

/** IFD 안의 한 항목을 빼고 뒤 항목과 다음-IFD 포인터를 12바이트 당긴다. 길이는 그대로다. */
function removeEntry(t: Tiff, ifd: Ifd, index: number): void {
  const base = t.start + ifd.offset;
  const count = ifd.entries.length;
  const tailStart = base + 2 + (index + 1) * 12;
  const tailEnd = base + 2 + count * 12 + 4; // 다음-IFD 포인터까지
  t.bytes.copyWithin(tailStart - 12, tailStart, tailEnd);
  t.bytes.fill(0, tailEnd - 12, tailEnd);
  t.view.setUint16(base, count - 1, t.le);
}

interface TiffInspection {
  hasGpsPointer: boolean;
  /** GPS IFD에 버전 말고 다른 항목이 있었다(또는 GPS IFD를 읽을 수 없었다). */
  hadLocation: boolean;
  coord: RoundedCoord | null;
  takenYear: number | null;
}

/**
 * TIFF 하나를 살펴보고, `remove`면 GPS를 제자리에서 지운다(길이 불변).
 *
 * 지우는 순서: GPS 항목들이 가리키는 값 → GPS IFD 자체 → IFD0/IFD1의 포인터
 * 항목. 포인터만 빼도 표준 리더는 GPS를 못 찾지만, 값이 파일에 남아 있으면
 * 바이트를 훑는 도구에는 보인다. 그래서 값도 0으로 덮는다.
 */
function inspectTiff(t: Tiff, remove: boolean): TiffInspection {
  const ifd0 = readIfd(t, u32(t, 4));
  const result: TiffInspection = {
    hasGpsPointer: false,
    hadLocation: false,
    coord: null,
    takenYear: takenYearFromExifIfd(t, ifd0),
  };

  const ifds = [ifd0];
  try {
    if (ifd0.next !== 0) ifds.push(readIfd(t, ifd0.next));
  } catch {
    // IFD1(썸네일)이 깨져 있어도 IFD0의 GPS는 처리한다.
  }

  for (const ifd of ifds) {
    const index = ifd.entries.findIndex(entry => entry.tag === TAG_GPS_IFD);
    if (index === -1) continue;
    result.hasGpsPointer = true;
    const pointer = ifd.entries[index];
    const gpsOffset = u32(t, pointer.pos - t.start + 8);
    try {
      const gps = readIfd(t, gpsOffset);
      result.coord ??= readGpsCoord(t, gps);
      if (gps.entries.some(entry => entry.tag !== 0)) result.hadLocation = true;
      if (remove) {
        for (const entry of gps.entries) {
          if (entry.inline || entry.size === 0) continue;
          const at = t.start + entry.valueOffset;
          if (at >= t.start + 8 && at + entry.size <= t.end) t.bytes.fill(0, at, at + entry.size);
        }
        t.bytes.fill(0, t.start + gpsOffset, t.start + gpsOffset + 2 + gps.entries.length * 12 + 4);
      }
    } catch {
      // 포인터는 있는데 GPS IFD를 읽을 수 없다. 무엇이 있었는지 모르므로 있었다고 친다.
      result.hadLocation = true;
    }
    if (remove) removeEntry(t, ifd, index);
  }
  return result;
}

// ── JPEG ──────────────────────────────────────────────────────────────────────

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * SOS 뒤 엔트로피 코딩 구간을 건너 첫 EOI의 끝 위치를 찾는다. 이 구간에서
 * `FF`는 `FF 00`(바이트 스터핑)이나 RSTn으로만 나오고, 프로그레시브 JPEG은
 * 스캔 사이에 길이를 가진 마커(DHT·SOS 등)가 끼므로 그 길이만큼 건너뛴다.
 * EOI가 없으면(잘린 파일) 파일 끝.
 */
export function findPrimaryEoi(bytes: Uint8Array, from: number): number {
  const n = bytes.length;
  let i = from;
  while (i < n - 1) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
    } else if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
    } else if (marker === 0xd9) {
      return i + 2;
    } else {
      if (i + 3 >= n) return n;
      i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    }
  }
  return n;
}

/**
 * EOI 뒤(보조 이미지) 구간을 제자리에서 고친다 — 길이를 바꾸면 MPF가
 * 가리키는 위치가 전부 어긋난다. 고친 곳이 있으면 true.
 */
function neutralizeTrailer(bytes: Uint8Array, from: number, end: number): boolean {
  let changed = false;

  for (let i = indexOfBytes(bytes, EXIF_ID, from, end); i !== -1; i = indexOfBytes(bytes, EXIF_ID, i + 1, end)) {
    // APP1 안이면 세그먼트 길이로 경계를 잡고, 아니면 구간 끝까지.
    const inApp1 = i >= from + 4 && bytes[i - 4] === 0xff && bytes[i - 3] === 0xe1;
    const limit = inApp1 ? Math.min(end, i - 2 + ((bytes[i - 2] << 8) | bytes[i - 1])) : end;
    const tiff = openTiff(bytes, i + EXIF_ID.length, limit);
    if (!tiff) continue;
    try {
      const inspection = inspectTiff(tiff, true);
      if (inspection.hasGpsPointer) changed = true;
    } catch {
      // 보조 이미지의 EXIF를 읽지 못하면 그대로 둔다. 표준 리더도 못 읽는 구조다.
    }
  }

  for (let i = indexOfBytes(bytes, XMP_ID, from, end); i !== -1; i = indexOfBytes(bytes, XMP_ID, i + 1, end)) {
    const inApp1 = i >= from + 4 && bytes[i - 4] === 0xff && bytes[i - 3] === 0xe1;
    if (!inApp1) continue;
    const segEnd = Math.min(end, i - 2 + ((bytes[i - 2] << 8) | bytes[i - 1]));
    const bodyStart = i + XMP_ID.length;
    if (hasXmpLocationText(bytes, bodyStart, segEnd)) {
      bytes.fill(0x20, bodyStart, segEnd);
      changed = true;
    }
  }
  return changed;
}

/** MPF 헤더 뒤에서 뺀 바이트 수만큼 MP Entry의 오프셋(첫 이미지 제외)을 당긴다. */
function patchMpfOffsets(bytes: Uint8Array, tiffStart: number, tiffEnd: number, shift: number): void {
  const t = openTiff(bytes, tiffStart, tiffEnd);
  if (!t) return;
  try {
    const ifd0 = readIfd(t, u32(t, 4));
    const entry = ifd0.entries.find(item => item.tag === TAG_MP_ENTRY);
    if (!entry || entry.count % 16 !== 0) return;
    for (let k = 0; k < entry.count / 16; k++) {
      const field = entry.valueOffset + k * 16 + 8;
      const offset = u32(t, field);
      if (offset !== 0 && offset >= shift) t.view.setUint32(t.start + field, offset - shift, t.le);
    }
  } catch {
    // MPF를 못 고치면 보조 이미지 위치만 어긋난다. 주 이미지는 멀쩡하다.
  }
}

/**
 * JPEG에서 위치 정보를 뺀다(맨 위 설명 참고). 구조를 따라갈 수 없는 파일이면
 * `ImageFormatError`를 던진다 — 그때는 `prepareImageBytes`가 보수적으로 처리한다.
 */
export function stripJpegLocation(input: Uint8Array): JpegStripResult {
  const bytes = input;
  const n = bytes.length;
  if (!isJpeg(bytes)) throw new ImageFormatError('JPEG이 아닙니다.');

  const out = new Uint8Array(n);
  let w = 0;
  const copy = (from: number, to: number) => {
    out.set(bytes.subarray(from, to), w);
    w += to - from;
  };

  const result: JpegStripResult = { bytes: out, locationRemoved: false, coord: null, droppedSegments: 0 };
  /** 뺀 세그먼트: 입력에서의 위치와 길이. MPF 오프셋 보정에 쓴다. */
  const dropped: Array<{ at: number; length: number }> = [];
  let mpf: { inputAt: number; tiffStart: number; tiffEnd: number } | null = null;
  let sawScan = false;

  copy(0, 2);
  let p = 2;
  while (p < n) {
    if (bytes[p] !== 0xff) throw new ImageFormatError('마커 자리가 어긋났습니다.');
    let q = p;
    while (q + 1 < n && bytes[q + 1] === 0xff) q++; // 채움 바이트
    if (q + 1 >= n) throw new ImageFormatError('파일이 마커에서 끝났습니다.');
    const marker = bytes[q + 1];

    if (marker === 0xd9) {
      copy(p, n);
      sawScan = true;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      copy(p, q + 2);
      p = q + 2;
      continue;
    }
    if (q + 3 >= n) throw new ImageFormatError('세그먼트 길이가 없습니다.');
    const length = (bytes[q + 2] << 8) | bytes[q + 3];
    const segEnd = q + 2 + length;
    if (length < 2 || segEnd > n) throw new ImageFormatError('세그먼트가 파일 밖으로 나갑니다.');
    const payload = q + 4;

    if (marker === 0xda) {
      // 여기부터 첫 EOI까지는 압축된 영상 — 한 바이트도 바꾸지 않는다.
      const eoi = findPrimaryEoi(bytes, segEnd);
      const trailerOut = w + (eoi - p);
      copy(p, n);
      if (eoi < n && neutralizeTrailer(out, trailerOut, w)) result.locationRemoved = true;
      sawScan = true;
      break;
    }

    if (marker === 0xe1 && startsWithAt(bytes, payload, EXIF_ID, segEnd)) {
      const outStart = w;
      copy(p, segEnd);
      const tiff = openTiff(out, outStart + (payload - p) + EXIF_ID.length, w);
      let handled = false;
      if (tiff) {
        try {
          const inspection = inspectTiff(tiff, true);
          result.coord ??= inspection.coord;
          if (inspection.hadLocation) result.locationRemoved = true;
          handled = true;
        } catch {
          handled = false;
        }
      }
      if (!handled) {
        // GPS가 있는지 확인할 수 없는 EXIF는 통째로 뺀다. 촬영 정보를 잃는 편이
        // 위치를 흘리는 편보다 낫다. 무엇이 있었는지 모르므로 "지웠다"고 적는다.
        w = outStart;
        out.fill(0, outStart, outStart + (segEnd - p));
        dropped.push({ at: p, length: segEnd - p });
        result.droppedSegments += 1;
        result.locationRemoved = true;
      }
    } else if (
      marker === 0xe1 &&
      (startsWithAt(bytes, payload, XMP_ID, segEnd) || startsWithAt(bytes, payload, XMP_EXT_ID, segEnd))
    ) {
      if (hasXmpLocationText(bytes, payload, segEnd)) result.locationRemoved = true;
      dropped.push({ at: p, length: segEnd - p });
      result.droppedSegments += 1;
    } else if (marker === 0xed) {
      if (hasIptcLocation(bytes, payload, segEnd)) result.locationRemoved = true;
      dropped.push({ at: p, length: segEnd - p });
      result.droppedSegments += 1;
    } else {
      if (marker === 0xe2 && startsWithAt(bytes, payload, MPF_ID, segEnd) && !mpf) {
        const tiffStart = w + (payload - p) + MPF_ID.length;
        mpf = { inputAt: p, tiffStart, tiffEnd: w + (segEnd - p) };
      }
      copy(p, segEnd);
    }
    p = segEnd;
  }

  if (!sawScan) throw new ImageFormatError('영상 데이터(SOS)를 찾지 못했습니다.');

  if (mpf) {
    const mpfAt = mpf.inputAt;
    const shift = dropped.filter(item => item.at > mpfAt).reduce((sum, item) => sum + item.length, 0);
    if (shift > 0) patchMpfOffsets(out, mpf.tiffStart, mpf.tiffEnd, shift);
  }

  result.bytes = out.slice(0, w);
  return result;
}

// ── JPEG이 아닌 파일 ──────────────────────────────────────────────────────────

/** PNG의 텍스트 청크 중 압축돼 있거나 hex로 적혀 바이트로는 읽을 수 없는 메타데이터. */
function pngHasOpaqueMetadata(bytes: Uint8Array): boolean {
  if (!startsWithAt(bytes, 0, PNG_SIGNATURE)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  while (p + 12 <= bytes.length) {
    const length = view.getUint32(p);
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    const dataStart = p + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) return false;
    if (type === 'iTXt' || type === 'zTXt' || type === 'tEXt') {
      const nul = bytes.indexOf(0, dataStart);
      const keyword = nul === -1 || nul > dataEnd ? '' : String.fromCharCode(...bytes.subarray(dataStart, nul));
      const metadataKeyword = /^(XML:com\.adobe\.xmp|Raw profile type (exif|iptc|xmp))$/i.test(keyword);
      // iTXt: 키워드 뒤 한 바이트가 압축 여부. zTXt는 늘 압축, tEXt의 raw profile은 hex 문자열.
      const opaque = type === 'iTXt' ? bytes[nul + 1] === 1 || /^Raw profile/i.test(keyword) : true;
      if (metadataKeyword && opaque) return true;
    }
    if (type === 'IEND') return false;
    p = dataEnd + 4;
  }
  return false;
}

/**
 * HEIC·PNG·WebP·TIFF 같은 파일에 위치 정보가 있는지 **읽기만** 한다.
 *
 * 형식마다 EXIF를 담는 상자가 다르지만(HEIC의 `Exif` 아이템, PNG의 `eXIf`,
 * WebP의 `EXIF` 청크, TIFF는 파일 자체) 안의 내용은 모두 같은 TIFF 구조다.
 * 그래서 컨테이너를 해석하는 대신 파일 전체에서 TIFF 헤더를 찾아 IFD로 읽히는
 * 것만 살펴본다. 우연히 헤더처럼 보이는 바이트는 IFD 검증에서 걸러지고,
 * 걸러지지 않더라도 틀리는 방향은 "위치 있음"(= 변환) 쪽이다.
 *
 * XMP의 위치 속성 이름도 찾는다. 압축돼 읽을 수 없는 PNG 메타데이터는 위치가
 * 있다고 친다.
 */
export function scanForLocation(bytes: Uint8Array): LocationScan {
  const scan: LocationScan = { hasLocation: false, coord: null, takenYear: null };
  const MAX_CANDIDATES = 64;
  let candidates = 0;

  for (let i = 0; i + 8 <= bytes.length && candidates < MAX_CANDIDATES; i++) {
    const b = bytes[i];
    if (b !== 0x49 && b !== 0x4d) continue;
    const isHeader =
      (b === 0x49 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0x2a && bytes[i + 3] === 0x00) ||
      (b === 0x4d && bytes[i + 1] === 0x4d && bytes[i + 2] === 0x00 && bytes[i + 3] === 0x2a);
    if (!isHeader) continue;
    const tiff = openTiff(bytes, i, bytes.length);
    if (!tiff) continue;
    candidates += 1;
    try {
      const inspection = inspectTiff(tiff, false);
      scan.takenYear ??= inspection.takenYear;
      if (inspection.hasGpsPointer && inspection.hadLocation) {
        scan.hasLocation = true;
        scan.coord ??= inspection.coord;
      }
    } catch {
      // IFD로 읽히지 않는 우연한 바이트.
    }
  }

  if (!scan.hasLocation && (hasXmpLocationText(bytes) || pngHasOpaqueMetadata(bytes))) scan.hasLocation = true;
  return scan;
}

// ── 올리기 전 판단 ────────────────────────────────────────────────────────────

export type UploadPlan =
  /** JPEG: 위치를 뺀 바이트를 올린다. `locationRemoved`가 배지를 정한다. */
  | { kind: 'jpeg'; bytes: Uint8Array<ArrayBuffer>; locationRemoved: boolean; coord: RoundedCoord | null }
  /** 위치 정보가 없다 — 원본 그대로 올린다. */
  | { kind: 'unchanged' }
  /** 위치 정보가 있는데 무손실로 뺄 수 없다 — 다시 인코딩하거나(브라우저) 막는다(CLI). */
  | { kind: 'reencode'; coord: RoundedCoord | null; takenYear: number | null };

/**
 * 파일 바이트 → 무엇을 올릴지. 순수 함수라 브라우저와 CLI가 같은 판단을 한다.
 *
 * JPEG인데 구조를 따라갈 수 없으면(잘렸거나 비표준) JPEG이 아닌 파일처럼
 * 훑어서 판단한다 — 위치가 보이면 다시 인코딩 쪽으로 보낸다.
 */
export function planUpload(bytes: Uint8Array): UploadPlan {
  if (isJpeg(bytes)) {
    try {
      const stripped = stripJpegLocation(bytes);
      return { kind: 'jpeg', bytes: stripped.bytes, locationRemoved: stripped.locationRemoved, coord: stripped.coord };
    } catch (error) {
      if (!(error instanceof ImageFormatError)) throw error;
    }
  }
  const scan = scanForLocation(bytes);
  return scan.hasLocation ? { kind: 'reencode', coord: scan.coord, takenYear: scan.takenYear } : { kind: 'unchanged' };
}
