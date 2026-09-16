import { z } from 'zod';
import { ALBUM_SLUG_RE, MAX_BULK, MAX_ORPHAN_DELETE, MIN_YEAR } from './limits';
import { NOTE_SLUG_RE } from '@/lib/notes';

export { ALBUM_SLUG_RE, MAX_BULK, MAX_ORPHAN_DELETE, MIN_YEAR };

/**
 * 관리 API가 받는 본문의 형태. **라우트와 테스트가 이 파일 하나를 같이 본다.**
 *
 * 모든 스키마가 `strictObject`인 이유: zod 기본(strip)은 모르는 키를 조용히
 * 버린다. 공개 주문 폼에서는 그 침묵이 우편번호를 몇 달 동안 삼켰고
 * (`orders-schema.ts` 주석), 관리 API에서는 반대 방향이 문제다 — 화면이
 * `cover`를 보냈는데 서버가 `cover_photo_id`만 안다면, 버리지 말고 400으로
 * 알려야 고칠 수 있다. 화이트리스트 밖의 키는 거절한다.
 *
 * 메시지는 한국어로 적는다. 관리 화면이 서버 메시지를 그대로 보여준다.
 */

// ── 공통 조각 ─────────────────────────────────────────────────────────────────

export const Id = z.number({ error: 'id가 올바르지 않습니다.' }).int().positive();

export const AlbumSlug = z
  .string()
  .regex(ALBUM_SLUG_RE, '슬러그는 영문 소문자·숫자·하이픈 1~64자여야 합니다.');

function uniqueIds(max: number) {
  return z
    .array(Id)
    .min(1, '선택한 항목이 없습니다.')
    .max(max, `한 번에 ${max}개까지 처리할 수 있습니다.`)
    .refine(ids => new Set(ids).size === ids.length, '목록에 중복된 id가 있습니다.');
}

/** 비워 두면 `null`로 저장되는 선택 텍스트. 빈 문자열과 null을 따로 두지 않는다. */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label}이(가) 너무 깁니다.`)
    .nullable()
    .transform(value => (value ? value : null));
}

const Year = z
  .number({ error: '연도가 올바르지 않습니다.' })
  .int('연도가 올바르지 않습니다.')
  .min(MIN_YEAR, '연도가 올바르지 않습니다.')
  .refine(year => year <= new Date().getFullYear() + 1, '연도가 올바르지 않습니다.');

const Location = z.string().trim().max(200, '장소가 너무 깁니다.');

// ── 앨범 ──────────────────────────────────────────────────────────────────────

const AlbumTitle = z.string().trim().min(1, '제목이 비어 있습니다.').max(120, '제목이 너무 깁니다.');

export const AlbumCreate = z.strictObject({
  title: AlbumTitle,
  slug: AlbumSlug,
  description: optionalText(2000, '설명').optional(),
});

export const AlbumUpdate = z
  .strictObject({
    id: Id,
    title: AlbumTitle.optional(),
    slug: AlbumSlug.optional(),
    description: optionalText(2000, '설명').optional(),
    published: z.boolean().optional(),
    /**
     * 커버는 URL이 아니라 **그 앨범 사진의 id**로 받는다. URL을 받으면 다른
     * 앨범의 사진이나 외부 주소를 커버로 걸 수 있고, 실제로 `cal` 앨범이
     * `aus`의 커버를 빌려 쓰고 있다. 서버가 id → src를 직접 찾는다.
     */
    cover_photo_id: Id.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.');

export const IdOrder = z.strictObject({
  ids: uniqueIds(500),
});

// ── 사진 일괄 작업 ────────────────────────────────────────────────────────────

const BulkIds = uniqueIds(MAX_BULK);

export const PhotoBulk = z.discriminatedUnion(
  'action',
  [
    z.strictObject({ action: z.literal('move'), ids: BulkIds, album_slug: AlbumSlug }),
    z.strictObject({ action: z.literal('location'), ids: BulkIds, location: Location }),
    z.strictObject({ action: z.literal('year'), ids: BulkIds, year: Year }),
    z.strictObject({ action: z.literal('hidden'), ids: BulkIds, hidden: z.boolean() }),
    z.strictObject({ action: z.literal('delete'), ids: BulkIds }),
  ],
  { error: '알 수 없는 일괄 작업입니다.' },
);
export type PhotoBulkInput = z.infer<typeof PhotoBulk>;

/**
 * 장소 이름 바꾸기. `from`은 **저장된 값 그대로** 비교한다(trim하지 않는다) —
 * `"서울 "`처럼 끝에 공백이 붙은 표기를 찾아 고치는 것도 이 도구의 일이다.
 */
export const LocationRename = z
  .strictObject({
    from: z.string().max(200, '장소가 너무 깁니다.'),
    to: Location,
    dry_run: z.boolean().optional(),
  })
  .refine(body => body.from !== body.to, '바꿀 이름이 지금과 같습니다.');

// ── 장소 좌표 ─────────────────────────────────────────────────────────────────

/**
 * 좌표는 받자마자 소수점 한 자리로 자른다(`places`의 `numeric(4,1)`과 같은
 * 규칙). 관리자가 지도 앱에서 복사한 `37.566535`를 붙여 넣어도 정밀한 값은
 * 서버를 통과하지 못한다 — `places`는 anon이 읽는 테이블이다.
 */
function coordinate(limit: number, label: string) {
  return z
    .number({ error: `${label}는 숫자여야 합니다.` })
    .refine(Number.isFinite, `${label}는 숫자여야 합니다.`)
    .min(-limit, `${label}는 -${limit}~${limit} 사이여야 합니다.`)
    .max(limit, `${label}는 -${limit}~${limit} 사이여야 합니다.`)
    .transform(value => {
      const rounded = Math.round(value * 10) / 10;
      return Object.is(rounded, -0) ? 0 : rounded;
    });
}

/** 장소 이름은 `photos.location`을 공개 화면이 읽는 모양(앞뒤 공백 없음)으로. */
const PlaceName = z.string().trim().min(1, '장소 이름이 비어 있습니다.').max(200, '장소가 너무 깁니다.');

export const PlaceUpsert = z.strictObject({
  name: PlaceName,
  lat: coordinate(90, '위도'),
  lng: coordinate(180, '경도'),
});

export const PlaceDelete = z.strictObject({ name: PlaceName });

/**
 * 새 사진 저장에 딸려 오는 좌표(`api/admin/photos` POST의 `place_coord`).
 * 브라우저가 이미 반올림해 보내지만 **서버가 다시 자른다** — 이 값은 사진별로
 * 저장되지 않고 장소마다 중앙값 하나로만 `places`에 들어간다.
 */
export const PlaceCoord = z.strictObject(
  {
    lat: coordinate(90, '위도'),
    lng: coordinate(180, '경도'),
  },
  { error: '좌표가 올바르지 않습니다.' },
);

// ── 데이터 점검 고치기 ────────────────────────────────────────────────────────

/** 촬영일 기준으로 연도 맞추기. 개요가 어긋난 사진의 id를 보낸다(전체는 여러 번에 나눠). */
export const YearSync = z.strictObject({
  ids: uniqueIds(MAX_BULK),
});

/**
 * 촬영 정보 다시 확인. 본문 없이 부르면 아직 시도하지 않은 사진을 채우고,
 * `ids`를 주면 이미 확인한 사진도 다시 묻는다(원본을 고친 뒤 표시 갱신용).
 * Admin API 호출이 장당 한 번이라 한 요청에 20장까지.
 */
export const MetadataRecheck = z.strictObject({
  ids: uniqueIds(20),
});

// ── 노트 ──────────────────────────────────────────────────────────────────────

/** `YYYY-MM-DD`이면서 달력에 있는 날짜. `2026-02-30`은 정규식만으로는 통과한다. */
const NoteDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')
  .refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, '없는 날짜입니다.');

const NoteFields = {
  slug: z.string().regex(NOTE_SLUG_RE, '슬러그는 영문 소문자·숫자·하이픈 1~80자여야 합니다.'),
  title: z.string().trim().min(1, '제목이 비어 있습니다.').max(200, '제목이 너무 깁니다.'),
  date: NoteDate,
  summary: z.string().trim().min(1, '요약이 비어 있습니다.').max(1000, '요약이 너무 깁니다.'),
  tags: z
    .array(z.string().trim().min(1, '빈 태그가 있습니다.').max(40, '태그가 너무 깁니다.'))
    .max(12, '태그는 12개까지 붙일 수 있습니다.')
    .transform(tags => [...new Set(tags)]),
  body: z.string().trim().min(1, '본문이 비어 있습니다.').max(50_000, '본문이 너무 깁니다.'),
  /**
   * 해석 범위. 비워 둘 수 없다 — 노트가 존재하는 이유가 "무엇을 말하지
   * 않는지"를 먼저 긋는 데 있다(`lib/notes.ts` 머리 주석). DB도 not null이지만
   * 빈 문자열은 not null을 통과하므로 여기서 막는다.
   */
  boundary: z.string().trim().min(1, '해석 범위(이 글이 주장하지 않는 것)는 필수입니다.').max(2000, '해석 범위가 너무 깁니다.'),
  related_project: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,80}$/, '관련 프로젝트 슬러그가 올바르지 않습니다.')
    .nullable()
    .transform(value => (value ? value : null)),
  published: z.boolean(),
};

export const NoteCreate = z.strictObject({
  ...NoteFields,
  tags: NoteFields.tags.optional().transform(tags => tags ?? []),
  related_project: NoteFields.related_project.optional().transform(value => value ?? null),
  published: NoteFields.published.optional().transform(value => value ?? false),
});
export type NoteCreateInput = z.output<typeof NoteCreate>;

export const NoteUpdate = z
  .strictObject({
    id: Id,
    slug: NoteFields.slug.optional(),
    title: NoteFields.title.optional(),
    date: NoteFields.date.optional(),
    summary: NoteFields.summary.optional(),
    tags: NoteFields.tags.optional(),
    body: NoteFields.body.optional(),
    boundary: NoteFields.boundary.optional(),
    related_project: NoteFields.related_project.optional(),
    published: NoteFields.published.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.');

export const NoteDelete = z.strictObject({ id: Id });

// ── 상품 ──────────────────────────────────────────────────────────────────────

const ProductFields = {
  name: z.string().trim().min(1, '상품명이 비어 있습니다.').max(120, '상품명이 너무 깁니다.'),
  price: z
    .number({ error: '가격은 숫자여야 합니다.' })
    .int('가격은 원 단위 정수여야 합니다.')
    .min(0, '가격은 0 이상이어야 합니다.')
    .max(100_000_000, '가격이 너무 큽니다.'),
  category: z.string().trim().max(60, '카테고리가 너무 깁니다.'),
  tag: optionalText(40, '태그'),
  description: z.string().trim().max(5000, '설명이 너무 깁니다.'),
  in_stock: z.boolean(),
  sort_order: z.number().int().min(-100_000).max(100_000),
  image_url: z.string().trim().min(1, '상품 이미지가 없습니다.').max(1000),
};

export const ProductCreate = z.strictObject({
  ...ProductFields,
  tag: ProductFields.tag.optional(),
  description: ProductFields.description.optional(),
  category: ProductFields.category.optional(),
  in_stock: ProductFields.in_stock.optional(),
  sort_order: ProductFields.sort_order.optional(),
});

export const ProductUpdate = z
  .strictObject({
    id: Id,
    name: ProductFields.name.optional(),
    price: ProductFields.price.optional(),
    category: ProductFields.category.optional(),
    tag: ProductFields.tag.optional(),
    description: ProductFields.description.optional(),
    in_stock: ProductFields.in_stock.optional(),
    sort_order: ProductFields.sort_order.optional(),
    image_url: ProductFields.image_url.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.');

// ── 주문 ──────────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OrderUpdate = z
  .strictObject({
    id: Id,
    status: z.enum(ORDER_STATUSES, { error: '주문 상태가 올바르지 않습니다.' }).optional(),
    tracking_carrier: optionalText(60, '택배사').optional(),
    tracking_number: optionalText(100, '송장번호').optional(),
    admin_memo: optionalText(5000, '메모').optional(),
    /** `shipped`로 바뀌고 송장번호가 있을 때 배송 안내 메일을 보낼지. */
    notify: z.boolean().optional(),
  })
  .refine(
    body => ['status', 'tracking_carrier', 'tracking_number', 'admin_memo'].some(key => key in body),
    '변경할 내용이 없습니다.',
  );

export const OrderEmail = z.strictObject({
  id: Id,
  kind: z.enum(['confirmation', 'shipping'], { error: '메일 종류가 올바르지 않습니다.' }),
});

// ── Cloudinary 정리 ───────────────────────────────────────────────────────────

export const OrphanDelete = z.strictObject({
  public_ids: z
    .array(z.string().min(1).max(300))
    .min(1, '선택한 파일이 없습니다.')
    .max(MAX_ORPHAN_DELETE, `한 번에 ${MAX_ORPHAN_DELETE}개까지 지울 수 있습니다.`)
    .refine(ids => new Set(ids).size === ids.length, '목록에 중복된 항목이 있습니다.'),
});

// ── 공통 ──────────────────────────────────────────────────────────────────────

/** 첫 번째 이슈의 메시지. 관리 화면은 한 번에 하나씩 고친다. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? '입력이 올바르지 않습니다.';
}
