import { z } from 'zod';
import { ALBUM_SLUG_RE, MAX_BULK, MAX_ORPHAN_DELETE, MIN_YEAR } from './limits';
import { isRenderableImageUrl } from '@/lib/cloudinary';
import { NOTE_SLUG_RE } from '@/lib/notes';
import {
  MAX_ADDONS,
  MAX_IMAGE_LABEL,
  MAX_IMAGES,
  MAX_OPTION_LABEL,
  MAX_OPTIONS,
  MAX_RELATED,
  OPTION_ID_RE,
  PRODUCT_STATUSES,
  isValidSlug,
} from '@/lib/product';

export { ALBUM_SLUG_RE, MAX_BULK, MAX_ORPHAN_DELETE, MIN_YEAR };

// strictObject: 모르는 키는 버리지 말고 400으로 거절한다. 예외는 "손 검증에서 옮긴 것" 묶음.

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

// 비우면 null로 저장한다. 빈 문자열과 null을 따로 두지 않는다.
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
    // 커버는 URL이 아니라 그 앨범 사진의 id로 받는다 — 서버가 id → src를 찾는다.
    cover_photo_id: Id.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.');

export const IdOrder = z.strictObject({
  ids: uniqueIds(500),
});

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

// `from`은 저장된 값 그대로 비교한다(trim하지 않는다) — 끝 공백 표기도 고칠 대상이다.
export const LocationRename = z
  .strictObject({
    from: z.string().max(200, '장소가 너무 깁니다.'),
    to: Location,
    dry_run: z.boolean().optional(),
  })
  .refine(body => body.from !== body.to, '바꿀 이름이 지금과 같습니다.');

// 좌표는 받자마자 소수점 한 자리로 자른다 — places는 anon이 읽는 테이블이다(개인정보).
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

const PlaceName = z.string().trim().min(1, '장소 이름이 비어 있습니다.').max(200, '장소가 너무 깁니다.');

export const PlaceUpsert = z.strictObject({
  name: PlaceName,
  lat: coordinate(90, '위도'),
  lng: coordinate(180, '경도'),
});

export const PlaceDelete = z.strictObject({ name: PlaceName });

// 브라우저가 이미 반올림해 보내지만 서버가 다시 자른다.
export const PlaceCoord = z.strictObject(
  {
    lat: coordinate(90, '위도'),
    lng: coordinate(180, '경도'),
  },
  { error: '좌표가 올바르지 않습니다.' },
);

// 손 검증에서 옮긴 묶음: 옛 계약(모르는 키 버림, Number() 해석, 옛 메시지)을 일부러 그대로 둔다.

function looseInt(message: string, accept: (n: number) => boolean) {
  return z.unknown().transform((value, ctx) => {
    const n = Number(value);
    if (!Number.isInteger(n) || !accept(n)) {
      ctx.issues.push({ code: 'custom', message, input: value });
      return z.NEVER;
    }
    return n;
  });
}

const INVALID_ALBUM_SLUG = 'Invalid album_slug';
const INVALID_ID = 'Invalid id';

const AlbumSlugParam = z.string(INVALID_ALBUM_SLUG).regex(ALBUM_SLUG_RE, INVALID_ALBUM_SLUG);

const PhotoId = looseInt(INVALID_ID, id => id > 0);

const PhotoTitle = z
  .string('제목이 비어 있습니다.')
  .trim()
  .min(1, '제목이 비어 있습니다.')
  .max(200, '제목이 너무 깁니다.');

// 빈 값은 받는다. 길이는 자르기 전에 본다 — 순서가 뜻이다.
const PhotoLocation = z.string('장소가 올바르지 않습니다.').max(200, '장소가 올바르지 않습니다.').trim();

const PhotoYear = looseInt(
  '연도가 올바르지 않습니다.',
  year => year >= MIN_YEAR && year <= new Date().getFullYear() + 1,
);

// 좌표가 틀리면 사진 저장은 막지 않고 좌표만 버린다. (0, 0)도 버린다.
const OptionalPlaceCoord = z
  .unknown()
  // `optional()`이 있어야 키가 아예 없을 때도 변환이 돈다.
  .optional()
  .transform(value => {
    if (value === undefined || value === null) return null;
    const coord = PlaceCoord.safeParse(value);
    return coord.success && !(coord.data.lat === 0 && coord.data.lng === 0) ? coord.data : null;
  });

export const MAX_PHOTO_BATCH = 60;
export const MAX_PHOTO_ORDER = 500;

// 사진 하나하나는 라우트가 photoCreateItem으로 본다 — 클라우드 설정이 없으면 503이 먼저다.
export const PhotoCreate = z.object(
  {
    album_slug: AlbumSlugParam,
    photos: z
      .array(z.unknown(), '저장할 사진이 없습니다.')
      .min(1, '저장할 사진이 없습니다.')
      .max(MAX_PHOTO_BATCH, `한 번에 ${MAX_PHOTO_BATCH}장까지 저장할 수 있습니다.`),
  },
  INVALID_ALBUM_SLUG,
);

const NOT_OWN_SRC = '이 사이트의 Cloudinary 주소가 아닙니다.';

// 키 순서가 곧 오류 순서다: src → 제목 → 장소 → 연도.
export function photoCreateItem(isOwnSrc: (src: string) => boolean) {
  return z.preprocess(
    raw => (Array.isArray(raw) ? {} : raw),
    z.object(
      {
        src: z.string(NOT_OWN_SRC).refine(isOwnSrc, NOT_OWN_SRC),
        title: PhotoTitle,
        location: PhotoLocation,
        year: PhotoYear,
        place_coord: OptionalPlaceCoord,
      },
      '사진 항목이 올바르지 않습니다.',
    ),
  );
}
export type PhotoCreateItemInput = z.output<ReturnType<typeof photoCreateItem>>;

// 보낸 필드만 바뀐다. `src`는 받지 않는다.
export const PhotoUpdate = z
  .object(
    {
      id: PhotoId,
      // 불리언이 아닌 값(`"false"`)을 진릿값으로 읽으면 반대로 동작한다.
      hidden: z.boolean('숨김 값이 올바르지 않습니다.').optional(),
      title: PhotoTitle.optional(),
      location: PhotoLocation.optional(),
      year: PhotoYear.optional(),
    },
    INVALID_ID,
  )
  .refine(
    body => ['hidden', 'title', 'location', 'year'].some(key => body[key as keyof typeof body] !== undefined),
    '변경할 내용이 없습니다.',
  );

export const PhotoDelete = z.object({ id: PhotoId }, INVALID_ID);

// 두 단계(pipe): 길이 오류가 id 오류보다 먼저 보고되어야 한다.
export const PhotoOrder = z.object(
  {
    album_slug: AlbumSlugParam,
    ids: z
      .array(z.unknown(), '순서 목록이 올바르지 않습니다.')
      .min(1, '순서 목록이 올바르지 않습니다.')
      .max(MAX_PHOTO_ORDER, '순서 목록이 올바르지 않습니다.')
      .pipe(
        z
          .array(looseInt('순서 목록에 잘못된 id가 있습니다.', id => id > 0))
          .refine(ids => new Set(ids).size === ids.length, '순서 목록에 중복된 id가 있습니다.'),
      ),
  },
  INVALID_ALBUM_SLUG,
);

export const PhotoSign = z.object({ album_slug: AlbumSlugParam }, INVALID_ALBUM_SLUG);

export const SETTINGS_KEYS = ['hero_image', 'hero_title', 'hero_subtitle'] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

// hero_image는 허용 호스트만 받는다 — 아니면 홈 렌더가 throw한다. 빈 문자열은 기본 이미지.
export const SettingsUpdate = z
  .preprocess(
    body => (body === undefined || Array.isArray(body) ? {} : body),
    z.record(z.string(), z.unknown(), 'Invalid body'),
  )
  .transform(body =>
    Object.entries(body).filter(
      (entry): entry is [SettingsKey, string] =>
        (SETTINGS_KEYS as readonly string[]).includes(entry[0]) && typeof entry[1] === 'string',
    ),
  )
  .refine(updates => updates.length > 0, 'No valid keys')
  .refine(updates => {
    const heroImage = updates.find(([key]) => key === 'hero_image')?.[1];
    return heroImage === undefined || heroImage === '' || isRenderableImageUrl(heroImage);
  }, '히어로 이미지는 res.cloudinary.com 또는 images.unsplash.com의 https 주소여야 합니다.');

export const YearSync = z.strictObject({
  ids: uniqueIds(MAX_BULK),
});

// Admin API 호출이 장당 한 번이라 한 요청에 20장까지.
export const MetadataRecheck = z.strictObject({
  ids: uniqueIds(20),
});

// `2026-02-30`은 정규식만으로는 통과한다.
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
  // 비워 둘 수 없다. 빈 문자열은 DB의 not null을 통과하므로 여기서 막는다.
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

const Price = z
  .number({ error: '가격은 숫자여야 합니다.' })
  .int('가격은 원 단위 정수여야 합니다.')
  .min(0, '가격은 0 이상이어야 합니다.');

// 주소가 이 사이트의 Cloudinary인지는 라우트가 본다.
export const ProductImageInput = z.strictObject({
  url: z.string().trim().min(1, '이미지 주소가 비어 있습니다.').max(1000, '이미지 주소가 너무 깁니다.'),
  label: optionalText(MAX_IMAGE_LABEL, '이미지 설명').optional().transform(value => value ?? null),
});

// id는 장바구니·주문 기록의 열쇠라 엄격히 본다. 가격 0("가격 미정")은 저장할 수 있다.
function pricedChoiceInput(noun: string) {
  return z.strictObject({
    id: z.string().regex(OPTION_ID_RE, `${noun} id는 영문 소문자·숫자·하이픈 1~32자여야 합니다.`),
    label: z.string().trim().min(1, `${noun} 이름이 비어 있습니다.`).max(MAX_OPTION_LABEL, `${noun} 이름이 너무 깁니다.`),
    price: Price,
    in_stock: z.boolean({ error: `${noun} 재고 여부가 올바르지 않습니다.` }),
  });
}

export const ProductOptionInput = pricedChoiceInput('옵션');

// 오류 문구가 "추가 상품"이라고 말해야 관리자가 맞는 칸을 고친다.
export const ProductAddonInput = pricedChoiceInput('추가 상품');

const ProductFields = {
  name: z.string().trim().min(1, '상품명이 비어 있습니다.').max(120, '상품명이 너무 깁니다.'),
  price: Price,
  category: z.string().trim().max(60, '카테고리가 너무 깁니다.'),
  tag: optionalText(40, '태그'),
  description: z.string().trim().max(5000, '설명이 너무 깁니다.'),
  sort_order: z.number().int().min(-100_000).max(100_000),
  image_url: z.string().trim().min(1, '상품 이미지가 없습니다.').max(1000),
  status: z.enum(PRODUCT_STATUSES, { error: '상품 상태가 올바르지 않습니다.' }),
  edition: optionalText(60, '에디션'),
  // 빈 칸은 null(주소를 정하지 않음 → /shop/<id>). 규칙은 `isValidSlug`, DB check와 같다.
  slug: z
    .string()
    .trim()
    .transform(value => value.toLowerCase())
    .refine(value => value === '' || isValidSlug(value), '주소는 영문 소문자·숫자·하이픈으로, 글자를 하나 이상 넣어 60자 이내로 적어 주세요.')
    .transform(value => value || null)
    .nullable(),
  images: z
    .array(ProductImageInput)
    .max(MAX_IMAGES, `이미지는 ${MAX_IMAGES}장까지 올릴 수 있습니다.`)
    .refine(images => new Set(images.map(image => image.url)).size === images.length, '같은 이미지가 두 번 들어 있습니다.'),
  options: z
    .array(ProductOptionInput)
    .max(MAX_OPTIONS, `옵션은 ${MAX_OPTIONS}개까지 둘 수 있습니다.`)
    .refine(options => new Set(options.map(option => option.id)).size === options.length, '옵션 id가 겹칩니다.'),
  addons: z
    .array(ProductAddonInput)
    .max(MAX_ADDONS, `추가 상품은 ${MAX_ADDONS}개까지 둘 수 있습니다.`)
    .refine(addons => new Set(addons.map(addon => addon.id)).size === addons.length, '추가 상품 id가 겹칩니다.'),
  // 상품 존재 여부는 보지 않는다 — 읽는 쪽이 없는 id를 무시한다. 자기 자신은 ProductUpdate가 막는다.
  related_ids: z
    .array(Id)
    .max(MAX_RELATED, `함께 구매는 ${MAX_RELATED}개까지 고를 수 있습니다.`)
    .refine(ids => new Set(ids).size === ids.length, '함께 구매에 같은 상품이 두 번 들어 있습니다.'),
};

// in_stock은 받지 않는다 — 서버가 status에서 계산한다. image_url도 images 첫 장으로 덮어쓴다.
export const ProductCreate = z
  .strictObject({
    name: ProductFields.name,
    price: ProductFields.price.optional(),
    tag: ProductFields.tag.optional(),
    description: ProductFields.description.optional(),
    category: ProductFields.category.optional(),
    sort_order: ProductFields.sort_order.optional(),
    image_url: ProductFields.image_url.optional(),
    status: ProductFields.status.optional(),
    edition: ProductFields.edition.optional(),
    slug: ProductFields.slug.optional(),
    images: ProductFields.images.optional(),
    options: ProductFields.options.optional(),
    addons: ProductFields.addons.optional(),
    related_ids: ProductFields.related_ids.optional(),
  })
  .refine(body => Boolean(body.image_url) || (body.images?.length ?? 0) > 0, '상품 이미지를 한 장 이상 올려 주세요.');
export type ProductCreateInput = z.output<typeof ProductCreate>;

export const ProductUpdate = z
  .strictObject({
    id: Id,
    name: ProductFields.name.optional(),
    price: ProductFields.price.optional(),
    category: ProductFields.category.optional(),
    tag: ProductFields.tag.optional(),
    description: ProductFields.description.optional(),
    sort_order: ProductFields.sort_order.optional(),
    image_url: ProductFields.image_url.optional(),
    status: ProductFields.status.optional(),
    edition: ProductFields.edition.optional(),
    slug: ProductFields.slug.optional(),
    images: ProductFields.images.min(1, '상품 이미지를 한 장 이상 남겨 주세요.').optional(),
    options: ProductFields.options.optional(),
    addons: ProductFields.addons.optional(),
    related_ids: ProductFields.related_ids.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.')
  .refine(body => !body.related_ids?.includes(body.id), '함께 구매에 이 상품 자신을 넣을 수 없습니다.');
export type ProductUpdateInput = z.output<typeof ProductUpdate>;

export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OrderUpdate = z
  .strictObject({
    id: Id,
    status: z.enum(ORDER_STATUSES, { error: '주문 상태가 올바르지 않습니다.' }).optional(),
    tracking_carrier: optionalText(60, '택배사').optional(),
    tracking_number: optionalText(100, '송장번호').optional(),
    admin_memo: optionalText(5000, '메모').optional(),
    // `shipped`로 바뀌고 송장번호가 있을 때 배송 안내 메일을 보낼지.
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

export const OrphanDelete = z.strictObject({
  public_ids: z
    .array(z.string().min(1).max(300))
    .min(1, '선택한 파일이 없습니다.')
    .max(MAX_ORPHAN_DELETE, `한 번에 ${MAX_ORPHAN_DELETE}개까지 지울 수 있습니다.`)
    .refine(ids => new Set(ids).size === ids.length, '목록에 중복된 항목이 있습니다.'),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? '입력이 올바르지 않습니다.';
}
