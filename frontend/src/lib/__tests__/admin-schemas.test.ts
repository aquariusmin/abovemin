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
  PlaceDelete,
  PlaceUpsert,
  ProductCreate,
  ProductUpdate,
  firstIssue,
} from '@/lib/admin/schemas';

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
