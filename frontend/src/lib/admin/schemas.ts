import { z } from 'zod';
import { ALBUM_SLUG_RE, MAX_BULK, MAX_ORPHAN_DELETE, MIN_YEAR } from './limits';
import { isRenderableImageUrl } from '@/lib/cloudinary';
import { NOTE_SLUG_RE } from '@/lib/notes';
import {
  MAX_IMAGE_LABEL,
  MAX_IMAGES,
  MAX_OPTION_LABEL,
  MAX_OPTIONS,
  OPTION_ID_RE,
  PRODUCT_STATUSES,
} from '@/lib/product';

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
 * 예외는 "손 검증에서 옮긴 것" 묶음 하나다(사진 한 장·순서·서명·사이트 설정).
 * 그쪽은 옮기기 전에 받던 입력을 그대로 받는다 — 이유는 그 묶음 머리에 있다.
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

// ── 사진 한 장·순서·사이트 설정 (손 검증에서 옮긴 것) ─────────────────────────
//
// 이 묶음은 **위의 규칙과 일부러 다르다.** `api/admin/photos`(+ `order`, `sign`)와
// `api/admin/settings`는 이 파일보다 먼저 생겼고 본문을 손으로 검증했다. 스키마로
// 옮기면서 받는 입력과 돌려주는 메시지를 한 글자도 바꾸지 않았다 — 화면이 서버
// 메시지를 그대로 보여 주고, 무엇을 받는지는 이미 계약이다.
//
//  - **모르는 키를 거절하지 않고 버린다**(`z.object`, strict 아님). 옛 코드는
//    아는 키만 꺼내 읽었다.
//  - **id와 연도는 `Number()`로 읽는다.** `"12"`, `"12.0"`, `[12]`도 12이고,
//    `true`는 1이다. zod의 `z.number()`는 이것들을 거절하므로 쓰지 않는다.
//    정수 판정도 `Number.isInteger` 그대로다(`.int()`는 안전 정수 범위까지 본다).
//  - **장소는 자르기 전 길이로 200자**를 본다(제목은 자른 뒤 길이).
//  - 메시지는 옛 문구 그대로다(`Invalid id`, `Invalid album_slug` 포함).
//
// 조이려면(strict, 숫자만 받기) 화면이 보내는 모양을 확인하고 따로 한다.

/** `Number(value)`가 조건에 맞는 정수일 때만 통과. 실패는 전부 같은 메시지. */
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

/** 요청이 가리키는 앨범. 형식은 `AlbumSlug`와 같고 메시지만 옛 문구다. */
const AlbumSlugParam = z.string(INVALID_ALBUM_SLUG).regex(ALBUM_SLUG_RE, INVALID_ALBUM_SLUG);

const PhotoId = looseInt(INVALID_ID, id => id > 0);

const PhotoTitle = z
  .string('제목이 비어 있습니다.')
  .trim()
  .min(1, '제목이 비어 있습니다.')
  .max(200, '제목이 너무 깁니다.');

/** 빈 값은 받는다("장소 없음"). 길이는 **자르기 전**에 본다 — 순서가 뜻이다. */
const PhotoLocation = z.string('장소가 올바르지 않습니다.').max(200, '장소가 올바르지 않습니다.').trim();

const PhotoYear = looseInt(
  '연도가 올바르지 않습니다.',
  year => year >= MIN_YEAR && year <= new Date().getFullYear() + 1,
);

/**
 * 좌표가 틀리면 사진 저장까지 막지 않고 좌표만 버린다 — 좌표는 지도용 부가
 * 정보다. (0, 0)은 GPS가 잡히기 전의 값이라 같이 버린다.
 */
const OptionalPlaceCoord = z
  .unknown()
  // `optional()`이 있어야 키가 아예 없을 때도 변환이 돈다(없으면 "필수 키 없음").
  .optional()
  .transform(value => {
    if (value === undefined || value === null) return null;
    const coord = PlaceCoord.safeParse(value);
    return coord.success && !(coord.data.lat === 0 && coord.data.lng === 0) ? coord.data : null;
  });

/** 한 번에 넣을 수 있는 장수. 업로드 UI가 배치로 보내므로 상한만 둔다. */
export const MAX_PHOTO_BATCH = 60;
/** 한 앨범에 이보다 많은 사진이 쌓이면 순서 변경 UI 자체를 다시 생각해야 한다. */
export const MAX_PHOTO_ORDER = 500;

/**
 * 새 사진 저장의 **봉투**. 사진 하나하나는 여기서 보지 않는다(`unknown`) —
 * `src`가 이 사이트의 Cloudinary인지는 클라우드 이름을 알아야 하고, 그 설정이
 * 없으면 503이 항목 오류보다 먼저다. 라우트가 `photoCreateItem`으로 하나씩 본다.
 */
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

/**
 * 새 사진 한 장. `isOwnSrc`는 라우트가 넘긴다(`isOwnCloudinaryUrl` + 클라우드
 * 이름). 키 순서가 곧 오류 순서다: src → 제목 → 장소 → 연도.
 *
 * 배열을 `{}`로 읽는 이유: 옛 검증은 `typeof raw === 'object'`만 봤고 배열은
 * 그걸 통과해 "주소가 아닙니다"에서 걸렸다. 메시지를 그대로 두려는 것뿐이다.
 */
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

/** 사진 한 장 수정. 보낸 필드만 바뀐다. `src`는 받지 않는다(보내면 버린다). */
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

/**
 * 앨범 안 사진 순서. 두 단계로 본다(`pipe`) — 길이가 틀리면 그 메시지가 먼저고,
 * id 하나하나는 그다음이다. 한 단계로 합치면 501개짜리 목록에 섞인 잘못된 id가
 * 먼저 보고된다.
 */
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

/** 업로드 서명을 받을 앨범. */
export const PhotoSign = z.object({ album_slug: AlbumSlugParam }, INVALID_ALBUM_SLUG);

export const SETTINGS_KEYS = ['hero_image', 'hero_title', 'hero_subtitle'] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/**
 * 사이트 설정. 아는 키이면서 값이 문자열인 것만 **고르고**, 나머지는 거절하지
 * 않고 버린다. 결과는 `[키, 값]` 목록이다 — 보낸 순서대로 저장한다.
 *
 * 본문을 읽지 못했거나(`undefined`) 배열이면 빈 객체로 본다: 옛 코드가 그 둘에
 * "Invalid body"가 아니라 "No valid keys"로 답했다.
 *
 * `hero_image`는 홈에서 `next/image`로 렌더된다. 허용되지 않은 호스트가 들어가면
 * 렌더 도중 throw가 나고 홈 전체가 error 바운더리로 떨어지므로 저장을 막는다 —
 * 잘못된 값이 들어간 뒤에는 관리 화면에서 되돌리기 전까지 홈이 깨져 있다.
 * 빈 문자열은 "기본 이미지로"라는 뜻이라 받는다.
 */
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

const Price = z
  .number({ error: '가격은 숫자여야 합니다.' })
  .int('가격은 원 단위 정수여야 합니다.')
  .min(0, '가격은 0 이상이어야 합니다.')
  .max(100_000_000, '가격이 너무 큽니다.');

/**
 * 갤러리 한 장. 주소가 이 사이트의 Cloudinary인지는 라우트가 본다(클라우드
 * 이름이 환경 변수라 스키마가 모른다). 설명은 비우면 null.
 */
export const ProductImageInput = z.strictObject({
  url: z.string().trim().min(1, '이미지 주소가 비어 있습니다.').max(1000, '이미지 주소가 너무 깁니다.'),
  label: optionalText(MAX_IMAGE_LABEL, '이미지 설명').optional().transform(value => value ?? null),
});

/**
 * 옵션 하나. id는 장바구니와 주문 기록에 남는 열쇠라 형식을 엄격히 본다
 * (`OPTION_ID_RE`). 가격 0은 저장할 수 있다 — "가격 미정" 옵션은 담기지 않을
 * 뿐이다(`isOptionAvailable`).
 */
export const ProductOptionInput = z.strictObject({
  id: z.string().regex(OPTION_ID_RE, '옵션 id는 영문 소문자·숫자·하이픈 1~32자여야 합니다.'),
  label: z.string().trim().min(1, '옵션 이름이 비어 있습니다.').max(MAX_OPTION_LABEL, '옵션 이름이 너무 깁니다.'),
  price: Price,
  in_stock: z.boolean({ error: '옵션 재고 여부가 올바르지 않습니다.' }),
});

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
  images: z
    .array(ProductImageInput)
    .max(MAX_IMAGES, `이미지는 ${MAX_IMAGES}장까지 올릴 수 있습니다.`)
    .refine(images => new Set(images.map(image => image.url)).size === images.length, '같은 이미지가 두 번 들어 있습니다.'),
  options: z
    .array(ProductOptionInput)
    .max(MAX_OPTIONS, `옵션은 ${MAX_OPTIONS}개까지 둘 수 있습니다.`)
    .refine(options => new Set(options.map(option => option.id)).size === options.length, '옵션 id가 겹칩니다.'),
};

/**
 * `in_stock`은 받지 않는다 — 서버가 `status`에서 계산해 맞춘다(`syncedColumns`).
 * 둘을 따로 받으면 "초안인데 in_stock = true" 같은 어긋난 행이 생긴다.
 * `image_url`도 `images`가 있으면 서버가 첫 장으로 덮어쓴다.
 */
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
    images: ProductFields.images.optional(),
    options: ProductFields.options.optional(),
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
    images: ProductFields.images.min(1, '상품 이미지를 한 장 이상 남겨 주세요.').optional(),
    options: ProductFields.options.optional(),
  })
  .refine(body => Object.keys(body).length > 1, '변경할 내용이 없습니다.');
export type ProductUpdateInput = z.output<typeof ProductUpdate>;

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
