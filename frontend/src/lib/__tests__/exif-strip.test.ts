import { describe, expect, it } from 'vitest';
import {
  findPrimaryEoi,
  ImageFormatError,
  planUpload,
  roundCoordinate,
  scanForLocation,
  stripJpegLocation,
} from '@/lib/exif-strip';
import { roundCoord } from '@/lib/admin/photo-metadata';

/**
 * 이 파일이 지키는 것: 올라가는 원본에 GPS·위치가 남지 않고, 압축된 영상
 * 바이트는 하나도 바뀌지 않으며, 촬영 정보 채우기가 읽는 EXIF(제조사·모델·
 * 촬영일)는 그대로 남는다. 입력은 테스트 안에서 바이트 단위로 합성한다 —
 * 실제 사진을 저장소에 두면 그 사진의 위치가 저장소에 남는다.
 */

// ── 합성 도구 ─────────────────────────────────────────────────────────────────

const enc = (text: string) => Uint8Array.from(text, ch => ch.charCodeAt(0));

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function indexOf(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const contains = (haystack: Uint8Array, needle: Uint8Array) => indexOf(haystack, needle) !== -1;

interface EntrySpec {
  tag: number;
  type: number;
  count: number;
  /** 값 바이트(이미 바이트 순서에 맞춘). 포인터 항목이면 비운다. */
  data?: Uint8Array;
  /** 하위 IFD 포인터(0x8769, 0x8825). */
  pointer?: 'exif' | 'gps';
}

function writer(le: boolean) {
  const u16 = (v: number) => {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v, le);
    return b;
  };
  const u32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, le);
    return b;
  };
  const rationals = (...pairs: Array<[number, number]>) => concat(...pairs.flatMap(([n, d]) => [u32(n), u32(d)]));
  const asciiValue = (text: string) => enc(`${text}\0`);
  return { u16, u32, rationals, asciiValue };
}

/**
 * IFD0 → (Exif IFD) → (GPS IFD) 순서로 늘어놓은 TIFF. 값이 4바이트를 넘으면
 * IFD 바로 뒤 데이터 영역에 둔다. 실제 카메라 파일과 같은 배치다.
 */
function buildTiff(
  le: boolean,
  ifds: { ifd0: EntrySpec[]; exif?: EntrySpec[]; gps?: EntrySpec[] },
  { brokenGpsPointer = false }: { brokenGpsPointer?: boolean } = {},
): Uint8Array {
  const w = writer(le);
  const order = (['ifd0', 'exif', 'gps'] as const).filter(name => ifds[name]);
  const blockSize = (entries: EntrySpec[]) =>
    2 + entries.length * 12 + 4 + entries.reduce((sum, e) => sum + (e.data && e.data.length > 4 ? e.data.length + (e.data.length % 2) : 0), 0);
  const offsets: Record<string, number> = {};
  let cursor = 8;
  for (const name of order) {
    offsets[name] = cursor;
    cursor += blockSize(ifds[name]!);
  }

  const parts: Uint8Array[] = [enc(le ? 'II' : 'MM'), w.u16(42), w.u32(8)];
  for (const name of order) {
    const entries = ifds[name]!;
    let dataAt = offsets[name] + 2 + entries.length * 12 + 4;
    const head: Uint8Array[] = [w.u16(entries.length)];
    const data: Uint8Array[] = [];
    for (const entry of entries) {
      let value: Uint8Array;
      if (entry.pointer) {
        value = w.u32(entry.pointer === 'gps' && brokenGpsPointer ? 0xfffff0 : offsets[entry.pointer]);
      } else if (entry.data!.length <= 4) {
        value = concat(entry.data!, new Uint8Array(4 - entry.data!.length));
      } else {
        value = w.u32(dataAt);
        const padded = concat(entry.data!, new Uint8Array(entry.data!.length % 2));
        data.push(padded);
        dataAt += padded.length;
      }
      head.push(w.u16(entry.tag), w.u16(entry.type), w.u32(entry.count), value);
    }
    head.push(w.u32(0));
    parts.push(...head, ...data);
  }
  return concat(...parts);
}

/** 서울시청 근처: 37°33'59.4"N 126°58'40.7"E → (37.6, 127.0). */
function cameraTiff(le: boolean, { gps = true, south = false } = {}): Uint8Array {
  const w = writer(le);
  const ifd0: EntrySpec[] = [
    { tag: 0x010f, type: 2, count: 6, data: w.asciiValue('Apple') },
    { tag: 0x0110, type: 2, count: 14, data: w.asciiValue('iPhone 15 Pro') },
    { tag: 0x8769, type: 4, count: 1, pointer: 'exif' },
  ];
  if (gps) ifd0.push({ tag: 0x8825, type: 4, count: 1, pointer: 'gps' });
  return buildTiff(le, {
    ifd0,
    exif: [
      { tag: 0x829a, type: 5, count: 1, data: w.rationals([1, 1053]) },
      { tag: 0x9003, type: 2, count: 20, data: w.asciiValue('2019:07:31 14:55:19') },
    ],
    gps: gps
      ? [
          { tag: 0x0000, type: 1, count: 4, data: Uint8Array.from([2, 2, 0, 0]) },
          { tag: 0x0001, type: 2, count: 2, data: enc(south ? 'S\0' : 'N\0') },
          { tag: 0x0002, type: 5, count: 3, data: w.rationals([37, 1], [33, 1], [5940, 100]) },
          { tag: 0x0003, type: 2, count: 2, data: enc(south ? 'W\0' : 'E\0') },
          { tag: 0x0004, type: 5, count: 3, data: w.rationals([126, 1], [58, 1], [4070, 100]) },
        ]
      : undefined,
  });
}

function segment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2;
  return concat(Uint8Array.from([0xff, marker, length >> 8, length & 0xff]), payload);
}

const exifSegment = (tiff: Uint8Array) => segment(0xe1, concat(enc('Exif\0\0'), tiff));
const xmpSegment = (body: string) => segment(0xe1, concat(enc('http://ns.adobe.com/xap/1.0/\0'), enc(body)));
const APP0 = segment(0xe0, enc('JFIF\0\x01\x01\0\0\x01\0\x01\0\0'));
const ICC = segment(0xe2, concat(enc('ICC_PROFILE\0\x01\x01'), new Uint8Array(40).fill(7)));
const COM = segment(0xfe, enc('made by a test'));
const DQT = segment(0xdb, new Uint8Array(65).fill(3));
const SOF0 = segment(0xc0, Uint8Array.from([8, 0, 16, 0, 16, 1, 1, 0x11, 0]));

/** SOS 헤더 + 엔트로피 데이터(바이트 스터핑과 RST 포함) + EOI. */
const SCAN = concat(
  segment(0xda, Uint8Array.from([1, 1, 0, 0, 63, 0])),
  Uint8Array.from([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0x78, 0xff, 0x00, 0x9a]),
  Uint8Array.from([0xff, 0xd9]),
);

function jpeg(...segments: Uint8Array[]): Uint8Array {
  return concat(Uint8Array.from([0xff, 0xd8]), ...segments, DQT, SOF0, SCAN);
}

/** 첫 SOS부터 첫 EOI까지 — 압축된 영상. */
function scanBytes(bytes: Uint8Array): Uint8Array {
  const start = indexOf(bytes, Uint8Array.from([0xff, 0xda]));
  const header = (bytes[start + 2] << 8) | bytes[start + 3];
  return bytes.slice(start, findPrimaryEoi(bytes, start + 2 + header));
}

const SEOUL = { lat: 37.6, lng: 127 };

// ── EXIF GPS ──────────────────────────────────────────────────────────────────

describe.each([
  ['little-endian (II)', true],
  ['big-endian (MM)', false],
])('stripJpegLocation — %s', (_label, le) => {
  const w = writer(le);
  const input = jpeg(APP0, exifSegment(cameraTiff(le)), DQT);

  it('GPS 좌표를 반올림해 돌려주고, 파일에서는 지운다', () => {
    const result = stripJpegLocation(input);
    expect(result.coord).toEqual(SEOUL);
    expect(result.locationRemoved).toBe(true);
    // 위도·경도 유리수 바이트가 파일 어디에도 남지 않는다.
    expect(contains(input, w.rationals([5940, 100]))).toBe(true);
    expect(contains(result.bytes, w.rationals([5940, 100]))).toBe(false);
    expect(contains(result.bytes, w.rationals([4070, 100]))).toBe(false);
    // 다시 읽어도 GPS가 없다.
    expect(scanForLocation(result.bytes).hasLocation).toBe(false);
    expect(stripJpegLocation(result.bytes).coord).toBeNull();
  });

  it('제조사·모델·촬영일·노출은 남는다', () => {
    const { bytes } = stripJpegLocation(input);
    expect(contains(bytes, enc('Apple\0'))).toBe(true);
    expect(contains(bytes, enc('iPhone 15 Pro\0'))).toBe(true);
    expect(contains(bytes, enc('2019:07:31 14:55:19'))).toBe(true);
    expect(contains(bytes, w.rationals([1, 1053]))).toBe(true);
    expect(scanForLocation(bytes).takenYear).toBe(2019);
  });

  it('길이를 바꾸지 않는다 — EXIF 안의 다른 오프셋이 그대로 맞는다', () => {
    expect(stripJpegLocation(input).bytes.length).toBe(input.length);
  });

  it('SOS부터 EOI까지는 바이트가 같다', () => {
    expect(scanBytes(stripJpegLocation(input).bytes)).toEqual(scanBytes(input));
  });

  it('남반구·서반구는 음수', () => {
    const result = stripJpegLocation(jpeg(exifSegment(cameraTiff(le, { south: true }))));
    expect(result.coord).toEqual({ lat: -37.6, lng: -127 });
  });

  it('GPS가 없으면 파일이 그대로다', () => {
    const plain = jpeg(APP0, exifSegment(cameraTiff(le, { gps: false })), COM);
    const result = stripJpegLocation(plain);
    expect(result.bytes).toEqual(plain);
    expect(result.locationRemoved).toBe(false);
    expect(result.coord).toBeNull();
  });
});

describe('stripJpegLocation — 세그먼트', () => {
  it('XMP는 통째로 빠지고, 위치가 적혀 있었으면 지웠다고 알린다', () => {
    const xmp = xmpSegment('<x:xmpmeta><rdf:Description exif:GPSLatitude="37,33.99N" photoshop:City="Seoul"/></x:xmpmeta>');
    const input = jpeg(APP0, exifSegment(cameraTiff(true, { gps: false })), xmp);
    const result = stripJpegLocation(input);
    expect(contains(result.bytes, enc('ns.adobe.com/xap'))).toBe(false);
    expect(contains(result.bytes, enc('Seoul'))).toBe(false);
    expect(result.locationRemoved).toBe(true);
    expect(result.droppedSegments).toBe(1);
    expect(result.bytes.length).toBe(input.length - xmp.length);
    expect(scanBytes(result.bytes)).toEqual(scanBytes(input));
  });

  it('위치가 없는 XMP도 빠지지만 "위치 없음"으로 남는다', () => {
    const result = stripJpegLocation(jpeg(xmpSegment('<x:xmpmeta><rdf:Description xmp:Rating="5"/></x:xmpmeta>')));
    expect(result.droppedSegments).toBe(1);
    expect(result.locationRemoved).toBe(false);
  });

  it('확장 XMP와 APP13(IPTC)도 뺀다', () => {
    const extended = segment(0xe1, concat(enc('http://ns.adobe.com/xmp/extension/\0'), enc('0123456789abcdef'), enc('<rdf/>')));
    const iptc = segment(0xed, concat(enc('Photoshop 3.0\x008BIM\x04\x04\0\0\0\0\0\x0a'), Uint8Array.from([0x1c, 0x02, 90, 0, 5]), enc('Seoul')));
    const result = stripJpegLocation(jpeg(APP0, extended, iptc));
    expect(result.droppedSegments).toBe(2);
    expect(result.locationRemoved).toBe(true);
    expect(contains(result.bytes, enc('Photoshop 3.0'))).toBe(false);
  });

  it('APP0·ICC·COM은 순서 그대로 남는다', () => {
    const input = jpeg(APP0, exifSegment(cameraTiff(false)), ICC, xmpSegment('<x/>'), COM);
    const { bytes } = stripJpegLocation(input);
    const positions = [APP0, ICC, COM].map(part => indexOf(bytes, part));
    expect(positions.every(at => at > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('GPS IFD를 읽을 수 없는 EXIF는 통째로 뺀다', () => {
    const broken = buildTiff(true, {
      ifd0: [
        { tag: 0x010f, type: 2, count: 6, data: enc('Apple\0') },
        { tag: 0x8825, type: 4, count: 1, pointer: 'gps' },
      ],
      gps: [{ tag: 0x0001, type: 2, count: 2, data: enc('N\0') }],
    }, { brokenGpsPointer: true });
    // 포인터가 파일 밖을 가리켜도 항목은 빼낼 수 있다 — 세그먼트는 남고 포인터만 사라진다.
    const result = stripJpegLocation(jpeg(exifSegment(broken)));
    expect(result.locationRemoved).toBe(true);
    expect(scanForLocation(result.bytes).hasLocation).toBe(false);

    // IFD0 자체가 깨졌으면 GPS가 있는지도 모른다 — EXIF째 뺀다.
    const garbage = concat(enc('II'), Uint8Array.from([42, 0, 0xff, 0xff, 0, 0]), new Uint8Array(20));
    const dropped = stripJpegLocation(jpeg(APP0, exifSegment(garbage)));
    expect(dropped.droppedSegments).toBe(1);
    expect(contains(dropped.bytes, enc('Exif\0\0'))).toBe(false);
  });

  it('두 번 지워도 결과가 같다', () => {
    const input = jpeg(APP0, exifSegment(cameraTiff(true)), xmpSegment('<GPSLatitude/>'), ICC);
    const once = stripJpegLocation(input).bytes;
    const twice = stripJpegLocation(once);
    expect(twice.bytes).toEqual(once);
    expect(twice.locationRemoved).toBe(false);
  });

  it('JPEG이 아니거나 SOS가 없으면 ImageFormatError', () => {
    expect(() => stripJpegLocation(enc('\x89PNG\r\n\x1a\n'))).toThrow(ImageFormatError);
    expect(() => stripJpegLocation(concat(Uint8Array.from([0xff, 0xd8]), APP0))).toThrow(ImageFormatError);
    expect(() => stripJpegLocation(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0]))).toThrow(ImageFormatError);
  });
});

// ── 첫 EOI 뒤: MPF 보조 이미지 ────────────────────────────────────────────────

describe('stripJpegLocation — MPF 보조 이미지', () => {
  /** MPF APP2: MP Entry 두 개(주 이미지 오프셋 0, 보조 이미지 오프셋 `second`). */
  function mpfSegment(second: number): Uint8Array {
    const w = writer(false);
    const entries = concat(
      w.u32(0x030000), w.u32(1000), w.u32(0), w.u16(0), w.u16(0),
      w.u32(0), w.u32(500), w.u32(second), w.u16(0), w.u16(0),
    );
    const tiff = buildTiff(false, {
      ifd0: [
        { tag: 0xb000, type: 7, count: 4, data: enc('0100') },
        { tag: 0xb001, type: 4, count: 1, data: w.u32(2) },
        { tag: 0xb002, type: 7, count: 32, data: entries },
      ],
    });
    return segment(0xe2, concat(enc('MPF\0'), tiff));
  }

  function build() {
    const secondary = jpeg(exifSegment(cameraTiff(true)), xmpSegment('<x:xmpmeta photoshop:City="Seoul"></x:xmpmeta>'));
    const xmp = xmpSegment('<x:xmpmeta exif:GPSLongitude="126"/>');
    // 보조 이미지 위치는 MPF 헤더(TIFF 시작) 기준. 먼저 자리표시 값으로 한 번 만들어 길이를 잰다.
    const assemble = (offset: number) => {
      const mpf = mpfSegment(offset);
      const primary = jpeg(APP0, mpf, xmp);
      const tiffStart = indexOf(primary, enc('MPF\0')) + 4;
      return { primary, tiffStart, mpf };
    };
    const draft = assemble(0);
    const offset = draft.primary.length - draft.tiffStart;
    const { primary, tiffStart } = assemble(offset);
    return { input: concat(primary, secondary), offset, tiffStart, xmpLength: xmp.length, primaryLength: primary.length };
  }

  it('앞에서 뺀 길이만큼 MPF 오프셋을 당겨, 보조 이미지를 계속 가리킨다', () => {
    const { input, offset, tiffStart, xmpLength } = build();
    expect(input[tiffStart + offset]).toBe(0xff);
    expect(input[tiffStart + offset + 1]).toBe(0xd8);

    const { bytes } = stripJpegLocation(input);
    const outTiff = indexOf(bytes, enc('MPF\0')) + 4;
    const entry = indexOf(bytes, Uint8Array.from([0, 0, 1, 0xf4]), outTiff); // 두 번째 MP Entry의 크기(500)
    const patched = new DataView(bytes.buffer, bytes.byteOffset).getUint32(entry + 4, false);
    expect(patched).toBe(offset - xmpLength);
    expect(bytes[outTiff + patched]).toBe(0xff);
    expect(bytes[outTiff + patched + 1]).toBe(0xd8);
  });

  it('보조 이미지의 EXIF GPS와 위치 XMP는 길이를 바꾸지 않고 지운다', () => {
    const { input, primaryLength, xmpLength } = build();
    const { bytes, locationRemoved } = stripJpegLocation(input);
    expect(locationRemoved).toBe(true);
    const secondaryOut = bytes.slice(primaryLength - xmpLength);
    expect(secondaryOut.length).toBe(input.length - primaryLength);
    expect(contains(secondaryOut, enc('Seoul'))).toBe(false);
    expect(contains(secondaryOut, writer(true).rationals([5940, 100]))).toBe(false);
    expect(contains(secondaryOut, enc('iPhone 15 Pro'))).toBe(true);
    expect(scanForLocation(bytes).hasLocation).toBe(false);
  });

  it('주 이미지의 SOS~EOI는 그대로다', () => {
    const { input } = build();
    expect(scanBytes(stripJpegLocation(input).bytes)).toEqual(scanBytes(input));
  });
});

describe('findPrimaryEoi', () => {
  it('바이트 스터핑·RST·스캔 사이 마커를 건너 첫 EOI 뒤를 가리킨다', () => {
    const progressive = concat(
      Uint8Array.from([0x11, 0xff, 0x00, 0x22, 0xff, 0xd3, 0x33]),
      segment(0xc4, Uint8Array.from([0, 1, 2, 0xff, 0xd9])), // 길이 안의 FFD9는 EOI가 아니다
      segment(0xda, Uint8Array.from([1, 1, 0, 0, 63, 0])),
      Uint8Array.from([0x44, 0xff, 0xff, 0xd9]),
      Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
    );
    const end = findPrimaryEoi(progressive, 0);
    expect(progressive[end - 2]).toBe(0xff);
    expect(progressive[end - 1]).toBe(0xd9);
    expect(progressive[end]).toBe(0xff);
    expect(progressive[end + 1]).toBe(0xd8);
  });

  it('EOI가 없으면 끝', () => {
    const bytes = Uint8Array.from([1, 2, 0xff, 0x00, 3]);
    expect(findPrimaryEoi(bytes, 0)).toBe(bytes.length);
  });
});

// ── JPEG이 아닌 파일 ──────────────────────────────────────────────────────────

describe('scanForLocation / planUpload', () => {
  it('TIFF 파일의 GPS를 찾고 좌표와 촬영 연도를 읽는다', () => {
    const tiff = concat(cameraTiff(false), new Uint8Array(64));
    expect(scanForLocation(tiff)).toEqual({ hasLocation: true, coord: SEOUL, takenYear: 2019 });
    expect(planUpload(tiff)).toEqual({ kind: 'reencode', coord: SEOUL, takenYear: 2019 });
  });

  it('HEIC처럼 상자 안에 묻힌 EXIF도 찾는다', () => {
    const heicLike = concat(enc('\0\0\0\x18ftypheic\0\0\0\0mif1heic'), new Uint8Array(300).fill(0x49), Uint8Array.from([0, 0, 0, 6]), enc('Exif\0\0'), cameraTiff(true), new Uint8Array(500).fill(0x4d));
    expect(planUpload(heicLike)).toMatchObject({ kind: 'reencode', coord: SEOUL });
  });

  it('GPS 없는 EXIF만 있으면 그대로 올린다', () => {
    const png = concat(enc('\x89PNG\r\n\x1a\n'), enc('\0\0\0\0IHDR'), cameraTiff(true, { gps: false }));
    expect(planUpload(png)).toEqual({ kind: 'unchanged' });
  });

  it('XMP에 위치 속성이 있으면 좌표를 몰라도 위치 있음', () => {
    const webp = concat(enc('RIFF\0\0\0\0WEBPXMP '), enc('<rdf:Description exif:GPSLatitude="1"/>'));
    expect(planUpload(webp)).toEqual({ kind: 'reencode', coord: null, takenYear: null });
  });

  it('압축된 PNG XMP는 읽을 수 없으므로 위치 있음으로 친다', () => {
    const chunk = (type: string, data: Uint8Array) => {
      const head = new Uint8Array(8);
      new DataView(head.buffer).setUint32(0, data.length);
      head.set(enc(type), 4);
      return concat(head, data, new Uint8Array(4));
    };
    const signature = enc('\x89PNG\r\n\x1a\n');
    const compressed = chunk('iTXt', concat(enc('XML:com.adobe.xmp\0'), Uint8Array.from([1, 0]), enc('\0\0'), new Uint8Array([0x78, 0x9c, 1, 2])));
    const plain = chunk('iTXt', concat(enc('XML:com.adobe.xmp\0'), Uint8Array.from([0, 0]), enc('\0\0<x:xmpmeta/>')));
    expect(planUpload(concat(signature, compressed, chunk('IEND', new Uint8Array())))).toMatchObject({ kind: 'reencode' });
    expect(planUpload(concat(signature, plain, chunk('IEND', new Uint8Array())))).toEqual({ kind: 'unchanged' });
  });

  it('JPEG은 무손실 경로로 간다', () => {
    const plan = planUpload(jpeg(exifSegment(cameraTiff(true))));
    expect(plan.kind).toBe('jpeg');
    expect(plan).toMatchObject({ locationRemoved: true, coord: SEOUL });
  });

  it('구조가 깨진 JPEG은 훑어서 판단한다', () => {
    const truncated = concat(Uint8Array.from([0xff, 0xd8]), exifSegment(cameraTiff(true)));
    expect(planUpload(truncated)).toMatchObject({ kind: 'reencode', coord: SEOUL });
    expect(planUpload(concat(Uint8Array.from([0xff, 0xd8]), APP0))).toEqual({ kind: 'unchanged' });
  });
});

describe('roundCoordinate', () => {
  it('photo-metadata의 roundCoord와 같은 규칙이다', () => {
    const samples: Array<[number, number]> = [
      [37.566535, 126.977969], [-33.8688, 151.2093], [0, 0], [-0.04, 0.04], [90, 180], [90.1, 0], [0, -180.5],
      [Number.NaN, 1], [35.05, 139.75], [-0.05, -0.05],
    ];
    for (const [lat, lng] of samples) expect(roundCoordinate(lat, lng)).toEqual(roundCoord(lat, lng));
  });
});
