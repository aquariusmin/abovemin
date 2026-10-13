import { describe, expect, it } from 'vitest';
import {
  AlbumCreate,
  AlbumUpdate,
  IdOrder,
  LocationRename,
  MAX_BULK,
  MAX_ORPHAN_DELETE,
  OrderEmail,
  OrderUpdate,
  OrphanDelete,
  PhotoBulk,
  PhotoCreate,
  PhotoDelete,
  PhotoOrder,
  PhotoSign,
  PhotoUpdate,
  PlaceDelete,
  PlaceUpsert,
  ProductCreate,
  ProductUpdate,
  SettingsUpdate,
  firstIssue,
  photoCreateItem,
} from '@/lib/admin/schemas';
import { isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import type { z } from 'zod';

/**
 * 이 파일이 지키는 것: 관리 API는 화이트리스트 밖의 키를 **거절**하고, 일괄
 * 작업은 상한을 넘지 못한다. 관리자 세션이 있어도 본문은 조작될 수 있다.
 */
const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('PhotoBulk', () => {
  it('다섯 가지 작업을 받는다', () => {
    expect(PhotoBulk.safeParse({ action: 'move', ids: [1, 2], album_slug: 'korea' }).success).toBe(true);
    expect(PhotoBulk.safeParse({ action: 'location', ids: [1], location: ' 서울 ' }).success).toBe(true);
    expect(PhotoBulk.safeParse({ action: 'year', ids: [1], year: 2019 }).success).toBe(true);
    expect(PhotoBulk.safeParse({ action: 'hidden', ids: [1], hidden: true }).success).toBe(true);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: [1] }).success).toBe(true);
  });

  it('장소는 앞뒤 공백을 걷어 저장한다', () => {
    const parsed = PhotoBulk.parse({ action: 'location', ids: [1], location: ' 서울 ' });
    expect(parsed).toMatchObject({ location: '서울' });
  });

  it('상한을 넘거나 비었거나 중복이면 거절한다', () => {
    expect(PhotoBulk.safeParse({ action: 'delete', ids: ids(MAX_BULK) }).success).toBe(true);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: ids(MAX_BULK + 1) }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: [] }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: [3, 3] }).success).toBe(false);
  });

  it('작업에 없는 키, 잘못된 id, 모르는 작업을 거절한다', () => {
    // `hidden` 작업에 `album_slug`를 끼워 넣어 한 번에 두 가지를 바꾸는 요청
    expect(PhotoBulk.safeParse({ action: 'hidden', ids: [1], hidden: true, album_slug: 'x' }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: [0] }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: ['1'] }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'delete', ids: [1.5] }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'truncate', ids: [1] }).success).toBe(false);
  });

  it('연도 범위와 슬러그 형식을 지킨다', () => {
    expect(PhotoBulk.safeParse({ action: 'year', ids: [1], year: 1800 }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'year', ids: [1], year: new Date().getFullYear() + 2 }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'move', ids: [1], album_slug: 'Korea' }).success).toBe(false);
    expect(PhotoBulk.safeParse({ action: 'move', ids: [1], album_slug: '../x' }).success).toBe(false);
  });
});

describe('AlbumCreate / AlbumUpdate', () => {
  it('설명이 비면 null로 바꾼다', () => {
    expect(AlbumCreate.parse({ title: '제주', slug: 'jeju', description: '  ' })).toEqual({
      title: '제주',
      slug: 'jeju',
      description: null,
    });
  });

  it('커버는 URL이 아니라 사진 id로만 받는다', () => {
    expect(AlbumUpdate.safeParse({ id: 1, cover_photo_id: 12 }).success).toBe(true);
    expect(AlbumUpdate.safeParse({ id: 1, cover: 'https://evil.example/x.jpg' }).success).toBe(false);
  });

  it('id만 있고 바꿀 게 없으면 거절한다', () => {
    const result = AlbumUpdate.safeParse({ id: 1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe('변경할 내용이 없습니다.');
  });

  it('슬러그 규칙: 소문자·숫자·하이픈 1~64자', () => {
    expect(AlbumCreate.safeParse({ title: 'x', slug: 'a'.repeat(64) }).success).toBe(true);
    expect(AlbumCreate.safeParse({ title: 'x', slug: 'a'.repeat(65) }).success).toBe(false);
    expect(AlbumCreate.safeParse({ title: 'x', slug: 'new york' }).success).toBe(false);
    expect(AlbumCreate.safeParse({ title: 'x', slug: '' }).success).toBe(false);
  });
});

describe('IdOrder', () => {
  it('중복 없는 양의 정수 목록만 받는다', () => {
    expect(IdOrder.safeParse({ ids: [3, 1, 2] }).success).toBe(true);
    expect(IdOrder.safeParse({ ids: [1, 1] }).success).toBe(false);
    expect(IdOrder.safeParse({ ids: [] }).success).toBe(false);
  });
});

describe('LocationRename', () => {
  it('from은 저장된 값 그대로(공백 포함) 비교하도록 남긴다', () => {
    expect(LocationRename.parse({ from: 'Seoul ', to: ' 서울' })).toEqual({ from: 'Seoul ', to: '서울' });
  });

  it('같은 이름으로 바꾸는 요청은 거절한다', () => {
    expect(LocationRename.safeParse({ from: '서울', to: '서울' }).success).toBe(false);
  });
});

describe('ProductCreate / ProductUpdate', () => {
  const valid = {
    name: 'Print A3',
    price: 35000,
    image_url: 'https://res.cloudinary.com/dmljaqqzc/image/upload/v1/phorage/shop/a.jpg',
  };

  it('필수 값만으로 만들 수 있다', () => {
    expect(ProductCreate.safeParse(valid).success).toBe(true);
  });

  it('가격은 0 이상의 정수', () => {
    expect(ProductCreate.safeParse({ ...valid, price: -1 }).success).toBe(false);
    expect(ProductCreate.safeParse({ ...valid, price: 10.5 }).success).toBe(false);
    expect(ProductCreate.safeParse({ ...valid, price: '35000' }).success).toBe(false);
    expect(ProductCreate.safeParse({ ...valid, price: 0 }).success).toBe(true);
  });

  it('모르는 키(id 덮어쓰기 등)를 거절한다', () => {
    expect(ProductCreate.safeParse({ ...valid, id: 99 }).success).toBe(false);
    expect(ProductUpdate.safeParse({ id: 1, created_at: '2020-01-01' }).success).toBe(false);
  });

  it('빈 태그는 null', () => {
    expect(ProductUpdate.parse({ id: 1, tag: '' })).toEqual({ id: 1, tag: null });
  });
});

describe('OrderUpdate / OrderEmail', () => {
  it('상태·송장·메모 중 하나는 있어야 한다', () => {
    expect(OrderUpdate.safeParse({ id: 1, notify: true }).success).toBe(false);
    expect(OrderUpdate.safeParse({ id: 1, admin_memo: '' }).success).toBe(true);
    expect(OrderUpdate.safeParse({ id: 1, status: 'shipped', tracking_number: '1234', notify: true }).success).toBe(true);
  });

  it('없는 상태는 거절한다', () => {
    expect(OrderUpdate.safeParse({ id: 1, status: 'refunded' }).success).toBe(false);
  });

  it('비운 송장번호는 null로 저장된다', () => {
    expect(OrderUpdate.parse({ id: 1, tracking_number: '  ' })).toEqual({ id: 1, tracking_number: null });
  });

  it('메일 종류는 둘뿐이다', () => {
    expect(OrderEmail.safeParse({ id: 1, kind: 'shipping' }).success).toBe(true);
    expect(OrderEmail.safeParse({ id: 1, kind: 'marketing' }).success).toBe(false);
  });
});

describe('OrphanDelete', () => {
  it(`한 번에 ${MAX_ORPHAN_DELETE}개까지`, () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => `phorage/archive/x${i}`);
    expect(OrphanDelete.safeParse({ public_ids: list(MAX_ORPHAN_DELETE) }).success).toBe(true);
    expect(OrphanDelete.safeParse({ public_ids: list(MAX_ORPHAN_DELETE + 1) }).success).toBe(false);
    expect(OrphanDelete.safeParse({ public_ids: ['a', 'a'] }).success).toBe(false);
  });
});

describe('PlaceUpsert', () => {
  it('좌표를 소수점 한 자리로 자른다 — 정밀한 좌표는 서버를 통과하지 못한다', () => {
    expect(PlaceUpsert.parse({ name: ' 서울 ', lat: 37.566535, lng: 126.977969 })).toEqual({
      name: '서울',
      lat: 37.6,
      lng: 127,
    });
    expect(PlaceUpsert.parse({ name: 'x', lat: -0.04, lng: 180 })).toEqual({ name: 'x', lat: 0, lng: 180 });
  });

  it('범위 밖·문자열·빈 이름·모르는 키는 거절한다', () => {
    expect(PlaceUpsert.safeParse({ name: 'x', lat: 90.1, lng: 0 }).success).toBe(false);
    expect(PlaceUpsert.safeParse({ name: 'x', lat: 0, lng: -180.5 }).success).toBe(false);
    expect(PlaceUpsert.safeParse({ name: 'x', lat: '37.5', lng: 127 }).success).toBe(false);
    expect(PlaceUpsert.safeParse({ name: '  ', lat: 1, lng: 1 }).success).toBe(false);
    expect(PlaceUpsert.safeParse({ name: 'x', lat: 1, lng: 1, source: 'gps' }).success).toBe(false);
    expect(PlaceDelete.safeParse({ name: '서울' }).success).toBe(true);
  });
});

describe('ProductCreate / ProductUpdate — 상태·이미지·옵션', () => {
  const IMG = 'https://res.cloudinary.com/dmljaqqzc/image/upload/v1/phorage/shop/';
  const full = {
    name: '숲 포스터',
    status: 'available',
    edition: '한정 30부',
    images: [
      { url: `${IMG}front.jpg`, label: '앞면' },
      { url: `${IMG}back.jpg`, label: '' },
    ],
    options: [
      { id: 'a3', label: 'A3 · 매트지', price: 38000, in_stock: true },
      { id: 'a2', label: 'A2 · 매트지', price: 58000, in_stock: false },
    ],
  };

  it('image_url 없이 이미지 목록만으로 만들 수 있고, 빈 설명은 null', () => {
    const parsed = ProductCreate.parse(full);
    expect(parsed.images?.[1]).toEqual({ url: `${IMG}back.jpg`, label: null });
  });

  it('이미지가 한 장도 없으면 만들 수 없다', () => {
    expect(ProductCreate.safeParse({ ...full, images: [] }).success).toBe(false);
    expect(ProductUpdate.safeParse({ id: 1, images: [] }).success).toBe(false);
  });

  it('상태는 셋뿐이고, in_stock은 받지 않는다(서버가 상태에서 계산한다)', () => {
    expect(ProductUpdate.safeParse({ id: 1, status: 'sold_out' }).success).toBe(true);
    expect(ProductUpdate.safeParse({ id: 1, status: 'hidden' }).success).toBe(false);
    expect(ProductUpdate.safeParse({ id: 1, in_stock: true }).success).toBe(false);
  });

  it('이미지 설명은 40자까지, 같은 이미지는 두 번 못 넣는다', () => {
    expect(ProductUpdate.safeParse({ id: 1, images: [{ url: `${IMG}a.jpg`, label: 'ㄱ'.repeat(41) }] }).success).toBe(false);
    expect(ProductUpdate.safeParse({ id: 1, images: [{ url: `${IMG}a.jpg` }, { url: `${IMG}a.jpg` }] }).success).toBe(false);
    expect(ProductUpdate.safeParse({ id: 1, images: [{ url: `${IMG}a.jpg`, extra: 1 }] }).success).toBe(false);
  });

  it('옵션 id 형식·중복, 가격, 이름을 본다', () => {
    const withOption = (patch: Record<string, unknown>) => ({
      id: 1,
      options: [{ id: 'a3', label: 'A3', price: 38000, in_stock: true, ...patch }],
    });
    expect(ProductUpdate.safeParse(withOption({})).success).toBe(true);
    expect(ProductUpdate.safeParse(withOption({ id: 'A3' })).success).toBe(false);
    expect(ProductUpdate.safeParse(withOption({ id: 'a3:x' })).success).toBe(false);
    expect(ProductUpdate.safeParse(withOption({ label: ' ' })).success).toBe(false);
    expect(ProductUpdate.safeParse(withOption({ price: -1 })).success).toBe(false);
    expect(ProductUpdate.safeParse(withOption({ price: 1.5 })).success).toBe(false);
    expect(ProductUpdate.safeParse(withOption({ in_stock: 'yes' })).success).toBe(false);
    expect(
      ProductUpdate.safeParse({
        id: 1,
        options: [
          { id: 'a3', label: 'A3', price: 1, in_stock: true },
          { id: 'a3', label: 'A3 다시', price: 2, in_stock: true },
        ],
      }).success,
    ).toBe(false);
  });

  it('빈 에디션은 null', () => {
    expect(ProductUpdate.parse({ id: 1, edition: '  ' })).toEqual({ id: 1, edition: null });
  });
});

/**
 * 아래 여섯 스키마는 손으로 쓴 검증을 옮긴 것이다(`api/admin/photos`, `order`,
 * `sign`, `api/admin/settings`). 이 테스트는 **옮기기 전의 동작**을 못 박는다 —
 * 옛 코드의 갈래마다 한 줄씩: 무엇을 받았고, 무엇을 어떤 문구로 거절했나.
 * 문구는 관리 화면이 그대로 보여 주므로 문자열까지 비교한다.
 *
 * 다른 스키마보다 너그러운 것(모르는 키를 버림, `"12"`를 12로 읽음)은 버그가
 * 아니라 옮겨 온 계약이다. 조이는 변경이면 이 테스트를 같이 고쳐야 한다.
 */

/** 라우트가 응답에 싣는 것과 같은 값: 통과하면 `null`, 아니면 첫 이슈의 문구. */
function rejection(schema: z.ZodType, input: unknown): string | null {
  const parsed = schema.safeParse(input);
  return parsed.success ? null : firstIssue(parsed.error);
}

const NEXT_YEAR = new Date().getFullYear() + 1;
const BAD_SLUG = 'Invalid album_slug';
const BAD_ID = 'Invalid id';

/** `Number()`가 양의 정수로 읽는 것 / 그렇지 않은 것. id 세 곳이 같은 규칙을 쓴다. */
const LOOSE_IDS: Array<[unknown, number]> = [[7, 7], ['7', 7], ['7.0', 7], [' 7 ', 7], [[7], 7], [true, 1], [1e20, 1e20]];
const NOT_IDS: unknown[] = [undefined, null, 0, -1, 1.5, '', 'abc', '1.5', false, [], [1, 2], {}];

/** 슬러그 한 칸을 쓰는 세 스키마(추가·순서·서명)가 같은 규칙, 같은 문구인지. */
function slugCases(schema: z.ZodType, rest: Record<string, unknown>) {
  it('앨범 슬러그: 영문 소문자·숫자·하이픈 1~64자', () => {
    for (const slug of ['korea', 'a', 'a-1', '-', 'a'.repeat(64)]) {
      expect(rejection(schema, { ...rest, album_slug: slug })).toBeNull();
    }
    for (const slug of [undefined, null, 5, '', 'Korea', 'ko rea', '../x', 'korea\n', 'a'.repeat(65), ['korea']]) {
      expect(rejection(schema, { ...rest, album_slug: slug })).toBe(BAD_SLUG);
    }
  });

  it('본문이 객체가 아니거나 읽지 못했으면 슬러그 오류로 답한다', () => {
    // `undefined`는 `parseBody`가 JSON을 읽지 못했을 때 넘기는 값이다.
    for (const body of [undefined, null, 5, 'korea', [], [{ ...rest, album_slug: 'korea' }]]) {
      expect(rejection(schema, body)).toBe(BAD_SLUG);
    }
  });

  it('모르는 키는 거절하지 않고 버린다', () => {
    const parsed = schema.safeParse({ ...rest, album_slug: 'korea', folder: 'x' });
    expect(parsed.success && !('folder' in (parsed.data as object))).toBe(true);
  });
}

describe('PhotoCreate — 새 사진 저장의 봉투', () => {
  const item = { src: 'x', title: 't', location: '', year: 2024 };
  slugCases(PhotoCreate, { photos: [item] });

  it('사진 목록: 배열이고 1~60장', () => {
    const list = (n: number) => Array.from({ length: n }, () => item);
    expect(rejection(PhotoCreate, { album_slug: 'korea', photos: list(1) })).toBeNull();
    expect(rejection(PhotoCreate, { album_slug: 'korea', photos: list(60) })).toBeNull();
    expect(rejection(PhotoCreate, { album_slug: 'korea', photos: list(61) })).toBe('한 번에 60장까지 저장할 수 있습니다.');
    for (const photos of [undefined, null, [], {}, 'x', 3]) {
      expect(rejection(PhotoCreate, { album_slug: 'korea', photos })).toBe('저장할 사진이 없습니다.');
    }
  });

  it('슬러그 오류가 목록 오류보다 먼저다', () => {
    expect(rejection(PhotoCreate, { album_slug: 'Korea', photos: [] })).toBe(BAD_SLUG);
  });

  it('사진 하나하나는 여기서 보지 않는다 — 틀린 항목이 61장 상한보다 먼저 보고되지 않게', () => {
    expect(rejection(PhotoCreate, { album_slug: 'korea', photos: [null, 5, 'x'] })).toBeNull();
    expect(rejection(PhotoCreate, { album_slug: 'korea', photos: Array.from({ length: 61 }, () => null) })).toBe(
      '한 번에 60장까지 저장할 수 있습니다.',
    );
  });
});

describe('photoCreateItem — 새 사진 한 장', () => {
  const CLOUD = 'democloud';
  const SRC = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/phorage/archive/korea/a.jpg`;
  const Item = photoCreateItem(src => isOwnCloudinaryUrl(src, CLOUD));
  const item = { src: SRC, title: '숲', location: '서울', year: 2024 };
  const NOT_OWN = '이 사이트의 Cloudinary 주소가 아닙니다.';

  it('정규화해서 돌려준다: 제목·장소는 자르고, 좌표가 없으면 null', () => {
    expect(Item.parse({ ...item, title: ' 숲 ', location: ' 서울 ' })).toEqual({ ...item, place_coord: null });
  });

  it('객체가 아니면 항목 오류, 배열은 빈 객체처럼 읽어 주소 오류', () => {
    for (const raw of [undefined, null, 5, 'x', true]) expect(rejection(Item, raw)).toBe('사진 항목이 올바르지 않습니다.');
    expect(rejection(Item, [])).toBe(NOT_OWN);
    expect(rejection(Item, [item])).toBe(NOT_OWN);
  });

  it('src: 이 계정의 Cloudinary 업로드 주소만', () => {
    for (const src of [
      undefined,
      null,
      5,
      '',
      'not a url',
      SRC.replace('https:', 'http:'),
      SRC.replace(CLOUD, 'other'),
      `https://res.cloudinary.com/${CLOUD}/image/fetch/https://evil.example/upload/x.jpg`,
      'https://images.unsplash.com/photo-1',
    ]) {
      expect(rejection(Item, { ...item, src })).toBe(NOT_OWN);
    }
  });

  it('제목: 문자열, 자른 뒤 1~200자', () => {
    for (const title of [undefined, null, 5, '', '   ']) {
      expect(rejection(Item, { ...item, title })).toBe('제목이 비어 있습니다.');
    }
    expect(rejection(Item, { ...item, title: 'x'.repeat(201) })).toBe('제목이 너무 깁니다.');
    expect(rejection(Item, { ...item, title: 'x'.repeat(200) })).toBeNull();
    // 길이는 자른 뒤에 잰다: 공백을 합쳐 200자를 넘어도 된다.
    expect(Item.parse({ ...item, title: ` ${'x'.repeat(200)} ` }).title).toHaveLength(200);
  });

  it('장소: 문자열, **자르기 전** 200자까지. 빈 값은 받는다', () => {
    for (const location of [undefined, null, 5, 'x'.repeat(201), ` ${'x'.repeat(200)}`]) {
      expect(rejection(Item, { ...item, location })).toBe('장소가 올바르지 않습니다.');
    }
    expect(Item.parse({ ...item, location: '' }).location).toBe('');
    expect(Item.parse({ ...item, location: '   ' }).location).toBe('');
    expect(Item.parse({ ...item, location: 'x'.repeat(200) }).location).toHaveLength(200);
    expect(Item.parse({ ...item, location: `${'x'.repeat(198)}  ` }).location).toHaveLength(198);
  });

  it('연도: Number()로 읽어 1826 ~ 내년의 정수', () => {
    for (const year of [1826, 2024, NEXT_YEAR, '2024', ' 2024 ', '2024.0', [2024]]) {
      expect(Item.parse({ ...item, year }).year).toBe(Number(year));
    }
    for (const year of [undefined, null, '', 'abc', true, 1825, NEXT_YEAR + 1, 2024.5, '2024.5', {}, []]) {
      expect(rejection(Item, { ...item, year })).toBe('연도가 올바르지 않습니다.');
    }
  });

  it('오류는 src → 제목 → 장소 → 연도 순서로 하나만 보고한다', () => {
    const bad = { src: 'x', title: '', location: 5, year: 'abc' };
    expect(rejection(Item, bad)).toBe(NOT_OWN);
    expect(rejection(Item, { ...bad, src: SRC })).toBe('제목이 비어 있습니다.');
    expect(rejection(Item, { ...bad, src: SRC, title: 't' })).toBe('장소가 올바르지 않습니다.');
    expect(rejection(Item, { ...bad, src: SRC, title: 't', location: '' })).toBe('연도가 올바르지 않습니다.');
  });

  it('좌표: 서버가 다시 반올림하고, 틀리면 사진을 막지 않고 좌표만 버린다', () => {
    const coord = (place_coord: unknown) => Item.parse({ ...item, place_coord }).place_coord;
    expect(coord({ lat: 37.566535, lng: 126.977969 })).toEqual({ lat: 37.6, lng: 127 });
    expect(coord(null)).toBeNull();
    // (0, 0)은 GPS가 잡히기 전의 값 — 반올림해서 (0, 0)이 되는 것도 같다.
    expect(coord({ lat: 0, lng: 0 })).toBeNull();
    expect(coord({ lat: 0.04, lng: -0.04 })).toBeNull();
    for (const bad of [{ lat: 91, lng: 0 }, { lat: '37', lng: 127 }, { lat: 1 }, { lat: 1, lng: 2, alt: 3 }, 'x', 5, []]) {
      expect(coord(bad)).toBeNull();
    }
  });

  it('모르는 키(id·sort_order·album_slug)는 버린다', () => {
    expect(Item.parse({ ...item, id: 9, sort_order: 3, album_slug: 'x' })).toEqual({ ...item, place_coord: null });
  });
});

describe('PhotoUpdate — 사진 한 장 수정', () => {
  it('보낸 필드만 돌려준다', () => {
    expect(PhotoUpdate.parse({ id: 5, title: ' 숲 ' })).toEqual({ id: 5, title: '숲' });
    expect(PhotoUpdate.parse({ id: 5, hidden: false })).toEqual({ id: 5, hidden: false });
    expect(PhotoUpdate.parse({ id: '5', hidden: true, title: 'a', location: ' b ', year: '2024' })).toEqual({
      id: 5,
      hidden: true,
      title: 'a',
      location: 'b',
      year: 2024,
    });
  });

  it('id: Number()로 읽어 양의 정수', () => {
    for (const [id, expected] of LOOSE_IDS) expect(PhotoUpdate.parse({ id, hidden: true }).id).toBe(expected);
    for (const id of NOT_IDS) expect(rejection(PhotoUpdate, { id, hidden: true })).toBe(BAD_ID);
    for (const body of [undefined, null, 5, 'x', [], [{ id: 5, hidden: true }]]) {
      expect(rejection(PhotoUpdate, body)).toBe(BAD_ID);
    }
  });

  it('숨김은 불리언만 — "false"를 진릿값으로 읽으면 반대로 동작한다', () => {
    for (const hidden of ['false', 'true', 0, 1, null, [], {}]) {
      expect(rejection(PhotoUpdate, { id: 5, hidden })).toBe('숨김 값이 올바르지 않습니다.');
    }
  });

  it('제목·장소·연도는 추가할 때와 같은 규칙', () => {
    expect(rejection(PhotoUpdate, { id: 5, title: '  ' })).toBe('제목이 비어 있습니다.');
    expect(rejection(PhotoUpdate, { id: 5, title: null })).toBe('제목이 비어 있습니다.');
    expect(rejection(PhotoUpdate, { id: 5, title: 'x'.repeat(201) })).toBe('제목이 너무 깁니다.');
    expect(rejection(PhotoUpdate, { id: 5, title: 'x'.repeat(200) })).toBeNull();
    expect(rejection(PhotoUpdate, { id: 5, location: null })).toBe('장소가 올바르지 않습니다.');
    expect(rejection(PhotoUpdate, { id: 5, location: ` ${'x'.repeat(200)}` })).toBe('장소가 올바르지 않습니다.');
    expect(PhotoUpdate.parse({ id: 5, location: '' })).toEqual({ id: 5, location: '' });
    expect(rejection(PhotoUpdate, { id: 5, year: null })).toBe('연도가 올바르지 않습니다.');
    expect(rejection(PhotoUpdate, { id: 5, year: 1825 })).toBe('연도가 올바르지 않습니다.');
    expect(rejection(PhotoUpdate, { id: 5, year: NEXT_YEAR + 1 })).toBe('연도가 올바르지 않습니다.');
    expect(PhotoUpdate.parse({ id: 5, year: 1826 })).toEqual({ id: 5, year: 1826 });
    expect(PhotoUpdate.parse({ id: 5, year: NEXT_YEAR })).toEqual({ id: 5, year: NEXT_YEAR });
  });

  it('오류는 id → 숨김 → 제목 → 장소 → 연도 순서로 하나만 보고한다', () => {
    const bad = { id: 0, hidden: 'x', title: '', location: 5, year: 'abc' };
    expect(rejection(PhotoUpdate, bad)).toBe(BAD_ID);
    expect(rejection(PhotoUpdate, { ...bad, id: 5 })).toBe('숨김 값이 올바르지 않습니다.');
    expect(rejection(PhotoUpdate, { ...bad, id: 5, hidden: true })).toBe('제목이 비어 있습니다.');
    expect(rejection(PhotoUpdate, { ...bad, id: 5, hidden: true, title: 't' })).toBe('장소가 올바르지 않습니다.');
    expect(rejection(PhotoUpdate, { ...bad, id: 5, hidden: true, title: 't', location: '' })).toBe(
      '연도가 올바르지 않습니다.',
    );
  });

  it('바꿀 것이 없으면 거절한다 — 모르는 키만 보낸 것도 같다', () => {
    expect(rejection(PhotoUpdate, { id: 5 })).toBe('변경할 내용이 없습니다.');
    expect(rejection(PhotoUpdate, { id: 5, src: 'https://res.cloudinary.com/x/image/upload/a.jpg' })).toBe(
      '변경할 내용이 없습니다.',
    );
    // id가 틀렸으면 그 오류가 먼저다.
    expect(rejection(PhotoUpdate, {})).toBe(BAD_ID);
  });

  it('`src`와 그 밖의 모르는 키는 거절하지 않고 버린다', () => {
    expect(PhotoUpdate.parse({ id: 5, title: 't', src: 'x', album_slug: 'y', sort_order: 1 })).toEqual({
      id: 5,
      title: 't',
    });
  });
});

describe('PhotoDelete', () => {
  it('id: Number()로 읽어 양의 정수, 모르는 키는 버린다', () => {
    for (const [id, expected] of LOOSE_IDS) expect(PhotoDelete.parse({ id, extra: 1 })).toEqual({ id: expected });
    for (const id of NOT_IDS) expect(rejection(PhotoDelete, { id })).toBe(BAD_ID);
    for (const body of [undefined, null, 5, '5', [], [5]]) expect(rejection(PhotoDelete, body)).toBe(BAD_ID);
  });
});

describe('PhotoOrder — 앨범 안 사진 순서', () => {
  const BAD_LIST = '순서 목록이 올바르지 않습니다.';
  const BAD_ITEM = '순서 목록에 잘못된 id가 있습니다.';
  const DUPLICATE = '순서 목록에 중복된 id가 있습니다.';
  const order = (list: unknown) => ({ album_slug: 'korea', ids: list });

  slugCases(PhotoOrder, { ids: [1] });

  it('받은 순서 그대로, 숫자로 돌려준다', () => {
    expect(PhotoOrder.parse(order([3, '1', [2]]))).toEqual({ album_slug: 'korea', ids: [3, 1, 2] });
  });

  it('목록: 배열이고 1~500개', () => {
    expect(rejection(PhotoOrder, order(ids(500)))).toBeNull();
    for (const list of [undefined, null, [], {}, '1,2', 3, ids(501)]) {
      expect(rejection(PhotoOrder, order(list))).toBe(BAD_LIST);
    }
  });

  it('id 하나하나: Number()로 읽어 양의 정수', () => {
    for (const [id, expected] of LOOSE_IDS) expect(PhotoOrder.parse(order([id])).ids).toEqual([expected]);
    for (const id of NOT_IDS.filter(value => value !== undefined)) {
      expect(rejection(PhotoOrder, order([1, id]))).toBe(BAD_ITEM);
    }
  });

  it('중복은 숫자로 읽은 뒤에 본다', () => {
    expect(rejection(PhotoOrder, order([2, 2]))).toBe(DUPLICATE);
    expect(rejection(PhotoOrder, order([2, '2']))).toBe(DUPLICATE);
    expect(rejection(PhotoOrder, order([1, true]))).toBe(DUPLICATE);
  });

  it('오류는 슬러그 → 길이 → 잘못된 id → 중복 순서로 하나만 보고한다', () => {
    const tooMany = Array.from({ length: 501 }, () => 'x');
    expect(rejection(PhotoOrder, { album_slug: 'Korea', ids: tooMany })).toBe(BAD_SLUG);
    // 길이가 틀리면 안에 무엇이 들었든 길이 오류다.
    expect(rejection(PhotoOrder, order(tooMany))).toBe(BAD_LIST);
    expect(rejection(PhotoOrder, order(Array.from({ length: 501 }, () => 1)))).toBe(BAD_LIST);
    // 잘못된 id가 중복보다 먼저다 — 어느 쪽이 앞에 있든.
    expect(rejection(PhotoOrder, order([2, 2, 'x']))).toBe(BAD_ITEM);
    expect(rejection(PhotoOrder, order(['x', 2, 2]))).toBe(BAD_ITEM);
  });
});

describe('PhotoSign — 업로드 서명', () => {
  slugCases(PhotoSign, {});

  it('슬러그만 돌려준다', () => {
    expect(PhotoSign.parse({ album_slug: 'korea' })).toEqual({ album_slug: 'korea' });
  });
});

describe('SettingsUpdate — 사이트 설정', () => {
  const OWN = 'https://res.cloudinary.com/democloud/image/upload/v1/hero.jpg';
  const BAD_HERO = '히어로 이미지는 res.cloudinary.com 또는 images.unsplash.com의 https 주소여야 합니다.';

  it('아는 키의 문자열 값만 골라 보낸 순서대로 돌려준다', () => {
    expect(SettingsUpdate.parse({ hero_subtitle: 'b', hero_image: OWN, hero_title: 'a' })).toEqual([
      ['hero_subtitle', 'b'],
      ['hero_image', OWN],
      ['hero_title', 'a'],
    ]);
    // 값은 자르지 않는다. 빈 문자열도 값이다("지운다").
    expect(SettingsUpdate.parse({ hero_title: '  a  ', hero_subtitle: '' })).toEqual([
      ['hero_title', '  a  '],
      ['hero_subtitle', ''],
    ]);
  });

  it('모르는 키와 문자열이 아닌 값은 거절하지 않고 버린다', () => {
    expect(SettingsUpdate.parse({ hero_title: 'a', admin_password: 'x', hero_subtitle: 5, hero_image: null })).toEqual([
      ['hero_title', 'a'],
    ]);
    expect(SettingsUpdate.parse(JSON.parse('{"__proto__": "x", "hero_title": "a"}'))).toEqual([['hero_title', 'a']]);
  });

  it('남는 것이 없으면 "No valid keys"', () => {
    for (const body of [{}, { other: 'x' }, { hero_title: 5 }, { hero_image: null, hero_subtitle: ['a'] }]) {
      expect(rejection(SettingsUpdate, body)).toBe('No valid keys');
    }
    // 읽지 못한 본문(`parseBody`의 undefined)과 배열도 옛 코드에서는 여기로 왔다.
    expect(rejection(SettingsUpdate, undefined)).toBe('No valid keys');
    expect(rejection(SettingsUpdate, [])).toBe('No valid keys');
    expect(rejection(SettingsUpdate, [['hero_title', 'a']])).toBe('No valid keys');
  });

  it('객체가 아닌 본문은 "Invalid body"', () => {
    for (const body of [null, 5, 'hero_title', true]) expect(rejection(SettingsUpdate, body)).toBe('Invalid body');
  });

  it('히어로 이미지: 비었거나, 렌더할 수 있는 호스트의 https 주소', () => {
    for (const hero_image of ['', OWN, 'https://images.unsplash.com/photo-1']) {
      expect(rejection(SettingsUpdate, { hero_image })).toBeNull();
    }
    for (const hero_image of [
      ' ',
      'not a url',
      '/hero.jpg',
      OWN.replace('https:', 'http:'),
      'https://evil.example/upload/a.jpg',
      'https://res.cloudinary.com.evil.example/x/image/upload/a.jpg',
    ]) {
      expect(rejection(SettingsUpdate, { hero_image, hero_title: 'a' })).toBe(BAD_HERO);
    }
  });

  it('문자열이 아닌 hero_image는 버려지므로 주소 확인도 받지 않는다', () => {
    expect(SettingsUpdate.parse({ hero_image: 5, hero_title: 'a' })).toEqual([['hero_title', 'a']]);
  });
});
