import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { log } from './logger';
import { NOTES_CACHE_TAG, NOTES_PRESENCE_TAG, SETTINGS_CACHE_TAG } from './cache-tags';
import { isMissingSchemaError, withColumnFallback } from './db-compat';
import { placeFromRow, type PlaceCoord } from './places';
import { noteFromRow, sortNotes, type Note, type NoteRow } from './notes';
import {
  isListed,
  parseImages,
  parseOptions,
  productStatus,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from './product';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Album {
  id: number;
  title: string;
  slug: string;
  cover: string;
  sort_order: number;
  photo_count?: number;
  /** 마이그레이션(20260916) 이후 컬럼. 적용 전 DB에는 없으므로 optional. */
  published?: boolean;
  description?: string | null;
  created_at?: string;
}

export interface Photo {
  id: number;
  album_slug: string;
  src: string;
  title: string;
  location: string;
  /** `photos.year`는 정수 컬럼이다. 문자열로 선언돼 있던 것을 스키마에 맞췄다. */
  year: number;
  sort_order: number;
  /** 마이그레이션(20260916) 이후 컬럼. 공개 조회는 이미 `hidden = false`만 받는다. */
  hidden?: boolean;
  created_at?: string;
  /**
   * 마이그레이션(20260916100000_archive_extras) 이후 컬럼. 촬영 정보 채우기가
   * 채우기 전에는 null이고, 적용 전 DB에는 아예 없다.
   *
   * `width`/`height`는 **비율로만** 쓴다(그리드가 이미지보다 먼저 자리를
   * 잡는다). 원본이 1500px 안팎으로 줄어 있어 크기 자체는 뜻이 없다.
   * 좌표는 여기에 없다 — 장소 단위로 `places`에만 있다.
   */
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: number | null;
}

export interface Product {
  id: number;
  name: string;
  /** 옵션이 있으면 가장 싼 옵션의 가격(관리 API가 맞춘다). 주문 금액은 옵션 가격이다. */
  price: number;
  /** 커버. `images`의 첫 장과 같다(관리 API가 맞춘다). */
  image_url: string;
  category: string;
  tag: string | null;
  description: string;
  /** 호환용. 상태의 원본은 `status`다(`lib/product.ts`). */
  in_stock: boolean;
  sort_order?: number;
  /**
   * 마이그레이션(20260917020000_shop_ready) 이후 컬럼. 공개 조회(`publicProduct`)는
   * 적용 전에도 채워서 돌려준다 — 상태는 옛 규칙으로 계산하고, 이미지는
   * `image_url` 한 장, 옵션은 빈 목록.
   */
  status?: ProductStatus;
  images?: ProductImage[];
  options?: ProductOption[];
  edition?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────
//
// 공개 조회는 관리 화면의 두 스위치를 따른다: 비공개 앨범(`albums.published =
// false`)과 숨긴 사진(`photos.hidden = true`)은 어디에도 나오지 않는다.
//
// 두 컬럼은 마이그레이션이 더한다. 코드가 먼저 배포되면 필터가
// `42703 column does not exist`로 실패하는데, 그때 페이지가 죽지 않도록
// 필터 없이 한 번 더 읽는다(`withColumnFallback`). 적용 전에는 애초에 숨긴
// 사진도 비공개 앨범도 있을 수 없으므로, 필터를 빼도 보이는 결과는 같다.

export async function getAlbums(): Promise<Album[]> {
  const { data, error } = await withColumnFallback(
    'getAlbums',
    () => supabase.from('albums').select('*').eq('published', true).order('sort_order'),
    () => supabase.from('albums').select('*').order('sort_order'),
  );
  if (error) { log.error('getAlbums', error); throw error; }
  return data ?? [];
}

// Albums with their photo counts in TWO queries (not N+1): fetch every photo's
// album_slug once and tally in JS. `cache()` dedups within a single request.
export const getAlbumsWithCounts = cache(async (): Promise<Array<Album & { photo_count: number }>> => {
  const [{ data: albums, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
    withColumnFallback(
      'getAlbumsWithCounts.albums',
      () => supabase.from('albums').select('*').eq('published', true).order('sort_order'),
      () => supabase.from('albums').select('*').order('sort_order'),
    ),
    // 숨긴 사진은 개수에서도 빠진다 — "12 pieces"라고 적고 11장을 보여주면 안 된다.
    withColumnFallback(
      'getAlbumsWithCounts.photos',
      () => supabase.from('photos').select('album_slug').eq('hidden', false),
      () => supabase.from('photos').select('album_slug'),
    ),
  ]);
  if (aErr) { log.error('getAlbumsWithCounts.albums', aErr); throw aErr; }
  if (pErr) log.warn('getAlbumsWithCounts.photos', pErr);
  const counts: Record<string, number> = {};
  for (const p of photos ?? []) counts[p.album_slug] = (counts[p.album_slug] ?? 0) + 1;
  return (albums ?? []).map(a => ({ ...a, photo_count: counts[a.slug] ?? 0 }));
});

// Wrapped in cache() so generateMetadata + the page body share one query per request.
//
// 비공개 앨범은 `null` — 페이지는 404가 된다. 슬러그를 안다고 열리면 비공개가
// 아니다. `.single()` 대신 `.maybeSingle()`: 0행은 오류가 아니라 "없음"이라
// 로그에 경고가 쌓이지 않는다.
export const getAlbumWithPhotos = cache(
  async (slug: string): Promise<{ album: Album; photos: Photo[] } | null> => {
    const [{ data: album, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
      withColumnFallback(
        'getAlbumWithPhotos.album',
        () => supabase.from('albums').select('*').eq('slug', slug).eq('published', true).maybeSingle(),
        () => supabase.from('albums').select('*').eq('slug', slug).maybeSingle(),
      ),
      withColumnFallback(
        'getAlbumWithPhotos.photos',
        () => supabase.from('photos').select('*').eq('album_slug', slug).eq('hidden', false).order('sort_order'),
        () => supabase.from('photos').select('*').eq('album_slug', slug).order('sort_order'),
      ),
    ]);
    // 조회 실패는 "없음"이 아니다. 앨범 페이지는 사진이 0장이면 `notFound()`를
    // 부르는데, 오류를 빈 목록으로 바꿔 넘기면 DB가 잠깐 흔들린 순간의 404가
    // ISR 캐시에 올라가 revalidate 주기 동안 멀쩡한 앨범이 사라진다. 던지면
    // Next는 재생성에 실패한 것으로 보고 이전 페이지를 계속 내보낸다.
    if (aErr) { log.error('getAlbumWithPhotos.album', aErr); throw aErr; }
    if (pErr) { log.error('getAlbumWithPhotos.photos', pErr); throw pErr; }
    if (!album) return null;
    return { album, photos: (photos ?? []).map(publicPhoto) };
  },
);

/**
 * 사진 페이지(`/archive/[slug]/[id]`)에 필요한 것: 사진, 그 앨범, 앨범 안의 앞뒤.
 *
 * 따로 조회하지 않고 `getAlbumWithPhotos`를 그대로 쓴다. 앞뒤 사진과 "12 / 45"를
 * 알려면 어차피 앨범의 공개 사진 목록이 필요하고, 그 목록에서 찾으면 **공개 규칙이
 * 한 곳에 모인다**: 숨긴 사진은 목록에 없고, 비공개 앨범은 `null`이고, 다른
 * 앨범의 사진 id를 이 앨범 주소에 붙이면 목록에서 찾지 못한다 — 셋 다 404다.
 * `cache()` 덕에 `generateMetadata`와 본문이 한 번만 읽는다.
 *
 * 조회 실패는 던진다(`getAlbumWithPhotos`의 주석). 404가 ISR 캐시에 앉지 않게.
 */
export async function getPhotoInAlbum(
  slug: string,
  id: number,
): Promise<{ album: Album; photo: Photo; index: number; total: number; prev: Photo | null; next: Photo | null } | null> {
  const result = await getAlbumWithPhotos(slug);
  if (!result) return null;
  const { album, photos } = result;
  const index = photos.findIndex(photo => photo.id === id);
  if (index === -1) return null;
  // 라이트박스와 같이 끝에서 처음으로 돈다. 한 장뿐이면 앞뒤가 자기 자신이라 뺀다.
  const many = photos.length > 1;
  return {
    album,
    photo: photos[index],
    index,
    total: photos.length,
    prev: many ? photos[(index - 1 + photos.length) % photos.length] : null,
    next: many ? photos[(index + 1) % photos.length] : null,
  };
}

export const getSiteSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error) log.warn('getSiteSettings', error);
    const settings: Record<string, string> = {};
    for (const row of data ?? []) settings[row.key] = row.value;
    return settings;
  },
  ['site-settings'],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 300 },
);

/**
 * 아카이브 전체의 사진. 앨범을 가로지르는 필터·검색용이다.
 *
 * 290장이 다섯 앨범에 흩어져 있는데, 지금까지는 앨범을 하나씩 열어 보는
 * 것 말고는 방법이 없었다. `location`과 `year`는 이미 모든 행에 있으므로,
 * "2019년에 찍은 것" 같은 질문은 새 데이터 없이 답할 수 있다.
 *
 * 한 번에 다 가져오는 것이 맞다: 290행 × 몇 개 컬럼이고, 필터가 바뀔 때마다
 * 왕복하는 것보다 낫다. 앨범 제목은 사진마다 출처를 표시하려고 같이 읽는다.
 */
export const getAllPhotos = cache(
  async (): Promise<Array<Photo & { album_title: string }>> => {
    const [{ data: photos, error: pErr }, { data: albums, error: aErr }] = await Promise.all([
      withColumnFallback(
        'getAllPhotos.photos',
        () => supabase.from('photos').select('*').eq('hidden', false)
          .order('year', { ascending: false }).order('sort_order'),
        () => supabase.from('photos').select('*')
          .order('year', { ascending: false }).order('sort_order'),
      ),
      supabase.from('albums').select('*'),
    ]);
    if (pErr) { log.error('getAllPhotos.photos', pErr); throw pErr; }
    if (aErr) log.warn('getAllPhotos.albums', aErr);

    // 비공개 앨범의 사진은 앨범을 가로지르는 검색에서도 빠져야 한다.
    //
    // "비공개 목록"이 아니라 "보이는 앨범 목록"으로 거른다. 공개 읽기 정책이
    // `published = true`인 앨범만 돌려주므로, anon 클라이언트는 비공개 앨범이
    // 있다는 것 자체를 모른다 — `published === false`를 찾는 필터는 늘 빈
    // 집합이 되어 아무것도 거르지 못한다. 앨범을 `select('*')`로 읽는 이유는
    // `published`를 이름으로 고르면 마이그레이션 전 DB에서 이 조회가 실패하기
    // 때문이고, 그때는 모든 앨범이 보이므로 결과가 같다.
    //
    // 앨범 조회가 실패했으면 거르지 않는다. 빈 목록으로 거르면 사진이 전부
    // 사라지는데, 그건 "앨범이 없다"가 아니라 "모른다"이기 때문이다.
    const titles = new Map((albums ?? []).map(a => [a.slug as string, a.title as string]));
    const visible = aErr ? null : new Set((albums ?? []).map(a => a.slug as string));
    return (photos ?? [])
      .filter(photo => !visible || visible.has(photo.album_slug))
      .map(photo => ({
        ...publicPhoto(photo),
        album_title: titles.get(photo.album_slug) ?? photo.album_slug,
      }));
  },
);

/**
 * 공개 화면이 실제로 그리는 컬럼만 남긴다.
 *
 * `/archive`의 필터는 290장을 **클라이언트 컴포넌트에** props로 넘기므로, 행의
 * 모든 컬럼이 HTML의 RSC 페이로드에 한 번씩 실린다. 촬영 정보 컬럼이 아홉 개
 * 늘면서 `select('*')`를 그대로 넘기면 쓰지도 않는 `lens`, `exif_checked_at`,
 * `updated_at`까지 290번 반복된다. 조회는 `*`로 두고(마이그레이션 전후 모두
 * 성공해야 한다) 내보낼 때 고른다.
 */
function publicPhoto(row: Photo): Photo {
  const photo: Photo = {
    id: row.id,
    album_slug: row.album_slug,
    src: row.src,
    title: row.title,
    location: row.location,
    year: row.year,
    sort_order: row.sort_order,
  };
  // 값이 있는 것만 싣는다 — null 아홉 개도 290번이면 무게다.
  if (row.width && row.height) {
    photo.width = row.width;
    photo.height = row.height;
  }
  if (row.taken_at) photo.taken_at = row.taken_at;
  if (row.camera) photo.camera = row.camera;
  if (row.focal_length) photo.focal_length = row.focal_length;
  if (row.aperture) photo.aperture = row.aperture;
  if (row.shutter) photo.shutter = row.shutter;
  if (row.iso) photo.iso = row.iso;
  return photo;
}

/**
 * 장소 좌표(소수점 한 자리). `/archive` 지도가 쓴다.
 *
 * 테이블이 아직 없으면(마이그레이션 전) 빈 목록 — 지도 토글이 숨는다. 다른
 * 오류도 빈 목록으로 읽는다: 지도는 부가 기능이라, 그것 때문에 아카이브 전체가
 * 재생성에 실패할 이유가 없다.
 */
export const getPlaces = cache(async (): Promise<PlaceCoord[]> => {
  const { data, error } = await supabase.from('places').select('name, lat, lng');
  if (error) {
    if (isMissingSchemaError(error)) log.warn('getPlaces.migration_pending', error);
    else log.error('getPlaces', error);
    return [];
  }
  return (data ?? []).map(placeFromRow).filter((place): place is PlaceCoord => place !== null);
});

// ── 노트 ──────────────────────────────────────────────────────────────────────
//
// 공개 읽기 정책이 `published = true`만 돌려주지만, 필터도 같이 건다 — 정책이
// 바뀌어도 초안이 새지 않게 두 겹으로.
//
// 테이블이 없으면(마이그레이션 전) "글 없음"이다. 그 상태의 사이트는 원래
// 노트가 잠들어 있던 사이트와 똑같이 보인다. 다른 오류는 던진다 — 여기서
// 빈 목록을 돌려주면 DB가 흔들린 순간의 "글 없음"(= /notes 404)이 캐시에 앉는다.
// 부르는 쪽이 빌드를 지키려고 잡을지 정한다.

async function readPublishedNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('slug, title, date, summary, tags, body, boundary, related_project')
    .eq('published', true);
  if (error) {
    if (isMissingSchemaError(error)) {
      log.warn('getPublishedNotes.migration_pending', error);
      return [];
    }
    log.error('getPublishedNotes', error);
    throw error;
  }
  const notes = ((data ?? []) as Array<Partial<NoteRow>>)
    .map(noteFromRow)
    .filter((note): note is Note => note !== null);
  return sortNotes(notes);
}

/** 공개된 글, 최신순. 목록·글·RSS·sitemap이 같이 쓴다. */
export const getPublishedNotes = unstable_cache(readPublishedNotes, ['published-notes'], {
  tags: [NOTES_CACHE_TAG],
  revalidate: 3600,
});

/** 공개된 글 하나. 글이 몇 편뿐이라 목록 캐시에서 찾는다 — 캐시 항목이 하나로 끝난다. */
export async function getNoteBySlug(slug: string): Promise<Note | null> {
  return (await getPublishedNotes()).find(note => note.slug === slug) ?? null;
}

/**
 * 푸터의 Notes 링크를 켤지. 목록과 **다른 태그**로 캐시한다(`cache-tags.ts`의
 * `NOTES_PRESENCE_TAG` 주석) — 모든 페이지가 이 값을 읽기 때문이다.
 *
 * `revalidate: false`(시간으로 만료하지 않음)가 중요하다. 캐시의 revalidate는
 * 그것을 읽는 페이지의 ISR 주기가 된다 — 3600을 주었더니 `/about`, 포트폴리오,
 * `/admin`까지 정적 페이지 전부가 "1시간마다 다시 굽기"로 바뀌었다(빌드 출력으로
 * 확인). 이 값은 관리 화면이 노트를 저장할 때 태그로 무효화하므로 시계가 필요
 * 없다. 대가: Supabase 대시보드에서 직접 공개 여부를 바꾸면 다음 배포나 다음
 * 노트 저장까지 푸터가 따라오지 않는다.
 */
export const hasPublishedNotes = unstable_cache(
  async (): Promise<boolean> => (await readPublishedNotes()).length > 0,
  ['has-published-notes'],
  { tags: [NOTES_PRESENCE_TAG], revalidate: false },
);

// ── 상품 ──────────────────────────────────────────────────────────────────────
//
// 공개 조회는 **초안을 돌려주지 않는다.** 목록·홈·sitemap·상세가 모두 이
// 함수들을 거치므로, 초안이 새는 길은 여기 하나만 막으면 된다. 공개 읽기
// 정책(RLS)이 아니라 코드에서 거르는 이유는 마이그레이션 파일 끝의 주석에 있다.
//
// `select('*')`를 유지한다: 새 컬럼(`status`, `images`, `options`, `edition`)을
// 이름으로 고르면 마이그레이션 전 DB에서 조회가 실패한다. `publicProduct`가
// 있으면 쓰고 없으면 옛 규칙으로 채운다.

/** DB 행 → 공개 화면의 상품. jsonb 안쪽은 믿지 않고 다시 읽는다. */
function publicProduct(row: Product & { status?: unknown; images?: unknown; options?: unknown }): Product {
  const edition = typeof row.edition === 'string' ? row.edition.trim() : '';
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    image_url: row.image_url,
    category: row.category ?? '',
    tag: row.tag ?? null,
    description: row.description ?? '',
    in_stock: row.in_stock,
    sort_order: row.sort_order,
    status: productStatus(row as Parameters<typeof productStatus>[0]),
    images: parseImages(row.images, row.image_url),
    options: parseOptions(row.options),
    edition: edition || null,
    ...(row.created_at ? { created_at: row.created_at } : {}),
    ...(row.updated_at ? { updated_at: row.updated_at } : {}),
  };
}

// 관리 화면에서 정한 순서(`sort_order`)를 따르고, 같은 값끼리는 예전처럼 id 순.
// 마이그레이션 전에는 `sort_order`가 없으므로 id 순으로만 읽는다.
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await withColumnFallback(
    'getProducts',
    () => supabase.from('products').select('*').order('sort_order').order('id'),
    () => supabase.from('products').select('*').order('id'),
  );
  if (error) { log.error('getProducts', error); throw error; }
  return (data ?? []).map(publicProduct).filter(isListed);
}

// Single product by id. Wrapped in cache() so generateMetadata + the page body
// share one query per request instead of fetching the same product twice.
//
// 초안이면 `null` — 페이지는 404가 된다. 주소를 안다고 초안이 열리면 초안이
// 아니다. `.maybeSingle()`: 없는 id는 오류가 아니라 "없음"이다.
export const getProductById = cache(async (id: number): Promise<Product | null> => {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) { log.warn('getProductById', error); return null; }
  if (!data) return null;
  const product = publicProduct(data);
  return isListed(product) ? product : null;
});
