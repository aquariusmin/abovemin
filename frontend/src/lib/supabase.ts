import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { log } from './logger';
import { NOTES_CACHE_TAG, NOTES_PRESENCE_TAG, SETTINGS_CACHE_TAG } from './cache-tags';
import { isMissingColumnError, isMissingSchemaError, withColumnFallback } from './db-compat';
import { placeFromRow, type PlaceCoord } from './places';
import { noteFromRow, sortNotes, type Note, type NoteRow } from './notes';
import {
  isListed,
  isValidSlug,
  parseAddons,
  parseImages,
  parseOptions,
  parseRelatedIds,
  parseSlug,
  productStatus,
  type ProductAddon,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from './product';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface Album {
  id: number;
  title: string;
  slug: string;
  cover: string;
  sort_order: number;
  photo_count?: number;
  /** 20260916 이후 컬럼. 적용 전 DB에는 없으므로 optional. */
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
  year: number;
  sort_order: number;
  /** 20260916 이후 컬럼. */
  hidden?: boolean;
  created_at?: string;
  /** archive_extras 이후 컬럼. `width`/`height`는 비율로만 쓴다(원본이 ~1500px로 줄어 있다). */
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
  /** 주문 금액은 옵션 가격이다 — 이 값이 아니다. */
  price: number;
  image_url: string;
  category: string;
  tag: string | null;
  description: string;
  /** 호환용. 상태의 원본은 `status`다(`lib/product.ts`). */
  in_stock: boolean;
  sort_order?: number;
  /** shop_ready 이후 컬럼. 적용 전에도 `publicProduct`가 옛 규칙으로 채운다. */
  status?: ProductStatus;
  images?: ProductImage[];
  options?: ProductOption[];
  edition?: string | null;
  /** product_addons 이후 컬럼. 적용 전에는 빈 목록. */
  addons?: ProductAddon[];
  related_ids?: number[];
  /** product_slug 이후 컬럼. 없으면 상세 주소는 /shop/<id>(`productPath`). */
  slug?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 공개 조회는 `albums.published`·`photos.hidden`을 따른다. 컬럼이 없으면 `withColumnFallback`으로 필터 없이 읽는다.

export async function getAlbums(): Promise<Album[]> {
  const { data, error } = await withColumnFallback(
    'getAlbums',
    () => supabase.from('albums').select('*').eq('published', true).order('sort_order'),
    () => supabase.from('albums').select('*').order('sort_order'),
  );
  if (error) { log.error('getAlbums', error); throw error; }
  return data ?? [];
}

// Two queries, not N+1. `cache()` dedups within a single request.
export const getAlbumsWithCounts = cache(async (): Promise<Array<Album & { photo_count: number }>> => {
  const [{ data: albums, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
    withColumnFallback(
      'getAlbumsWithCounts.albums',
      () => supabase.from('albums').select('*').eq('published', true).order('sort_order'),
      () => supabase.from('albums').select('*').order('sort_order'),
    ),
    // 숨긴 사진은 개수에서도 빠진다.
    withColumnFallback(
      'getAlbumsWithCounts.photos',
      () => supabase.from('photos').select('album_slug').eq('hidden', false),
      () => supabase.from('photos').select('album_slug'),
    ),
  ]);
  if (aErr) { log.error('getAlbumsWithCounts.albums', aErr); throw aErr; }
  // 던진다 — 빈 결과를 내면 `/archive`가 통째로 비어 캐시에 앉는다.
  if (pErr) { log.error('getAlbumsWithCounts.photos', pErr); throw pErr; }
  const counts: Record<string, number> = {};
  for (const p of photos ?? []) counts[p.album_slug] = (counts[p.album_slug] ?? 0) + 1;
  return (albums ?? []).map(a => ({ ...a, photo_count: counts[a.slug] ?? 0 }));
});

// 비공개 앨범은 `null`(404). `.maybeSingle()`: 0행은 오류가 아니라 "없음".
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
    // 조회 실패는 "없음"이 아니다 — 던져야 ISR이 404를 캐시하지 않고 이전 페이지를 내보낸다.
    if (aErr) { log.error('getAlbumWithPhotos.album', aErr); throw aErr; }
    if (pErr) { log.error('getAlbumWithPhotos.photos', pErr); throw pErr; }
    if (!album) return null;
    return { album, photos: (photos ?? []).map(publicPhoto) };
  },
);

// 공개 규칙을 한 곳에 두려고 `getAlbumWithPhotos` 목록에서 찾는다(숨김·비공개·다른 앨범 id는 전부 404).
export async function getPhotoInAlbum(
  slug: string,
  id: number,
): Promise<{ album: Album; photo: Photo; photos: Photo[]; index: number; total: number; prev: Photo | null; next: Photo | null } | null> {
  const result = await getAlbumWithPhotos(slug);
  if (!result) return null;
  const { album, photos } = result;
  const index = photos.findIndex(photo => photo.id === id);
  if (index === -1) return null;
  const many = photos.length > 1;
  return {
    album,
    photo: photos[index],
    photos,
    index,
    total: photos.length,
    prev: many ? photos[(index - 1 + photos.length) % photos.length] : null,
    next: many ? photos[(index + 1) % photos.length] : null,
  };
}

export const getSiteSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from('site_settings').select('key, value');
    // 테이블이 없을 때만 기본값. 다른 오류는 던진다 — `unstable_cache`는 던진 결과를 캐시하지 않는다.
    if (error) {
      if (!isMissingSchemaError(error)) { log.error('getSiteSettings', error); throw error; }
      log.warn('getSiteSettings.migration_pending', error);
    }
    const settings: Record<string, string> = {};
    for (const row of data ?? []) settings[row.key] = row.value;
    return settings;
  },
  ['site-settings'],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 300 },
);

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
    // 앨범 조회 실패도 던진다 — 거르지 않은 목록이면 비공개 앨범 사진이 캐시에 앉는다.
    if (aErr) { log.error('getAllPhotos.albums', aErr); throw aErr; }

    // "보이는 앨범"으로 거른다: anon은 RLS로 비공개 앨범을 아예 못 본다. `select('*')`는 마이그레이션 전 호환.
    const titles = new Map((albums ?? []).map(a => [a.slug as string, a.title as string]));
    const visible = new Set((albums ?? []).map(a => a.slug as string));
    return (photos ?? [])
      .filter(photo => visible.has(photo.album_slug))
      .map(photo => ({
        ...publicPhoto(photo),
        album_title: titles.get(photo.album_slug) ?? photo.album_slug,
      }));
  },
);

// 클라이언트로 넘어가는 컬럼만 남긴다(RSC 페이로드). 조회는 `*`로 둔다 — 마이그레이션 전후 호환.
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

// 지도는 부가 기능이라 모든 오류를 빈 목록으로 읽는다(아카이브 재생성을 막지 않게).
export const getPlaces = cache(async (): Promise<PlaceCoord[]> => {
  const { data, error } = await supabase.from('places').select('name, lat, lng');
  if (error) {
    if (isMissingSchemaError(error)) log.warn('getPlaces.migration_pending', error);
    else log.error('getPlaces', error);
    return [];
  }
  return (data ?? []).map(placeFromRow).filter((place): place is PlaceCoord => place !== null);
});

// 정책과 필터 두 겹으로 초안을 막는다. 테이블 없음만 "글 없음", 다른 오류는 던진다(404 캐시 방지).

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

export const getPublishedNotes = unstable_cache(readPublishedNotes, ['published-notes'], {
  tags: [NOTES_CACHE_TAG],
  revalidate: 3600,
});

export async function getNoteBySlug(slug: string): Promise<Note | null> {
  return (await getPublishedNotes()).find(note => note.slug === slug) ?? null;
}

// 모든 페이지가 읽으므로 `revalidate: false`가 중요하다 — 시간을 주면 정적 페이지 전부가 ISR로 바뀐다.
export const hasPublishedNotes = unstable_cache(
  async (): Promise<boolean> => (await readPublishedNotes()).length > 0,
  ['has-published-notes'],
  { tags: [NOTES_PRESENCE_TAG], revalidate: false },
);

// 공개 조회는 초안을 돌려주지 않는다(여기 하나로 막는다). 새 컬럼 호환을 위해 `select('*')`를 유지한다.

// jsonb 안쪽은 믿지 않고 다시 읽는다.
function publicProduct(
  row: Product & { status?: unknown; images?: unknown; options?: unknown; addons?: unknown; related_ids?: unknown; slug?: unknown },
): Product {
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
    addons: parseAddons(row.addons),
    related_ids: parseRelatedIds(row.related_ids, row.id),
    slug: parseSlug(row.slug),
    ...(row.created_at ? { created_at: row.created_at } : {}),
    ...(row.updated_at ? { updated_at: row.updated_at } : {}),
  };
}

// `sort_order`가 없으면(마이그레이션 전) id 순으로만 읽는다.
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await withColumnFallback(
    'getProducts',
    () => supabase.from('products').select('*').order('sort_order').order('id'),
    () => supabase.from('products').select('*').order('id'),
  );
  if (error) { log.error('getProducts', error); throw error; }
  return (data ?? []).map(publicProduct).filter(isListed);
}

// 초안이면 `null`(404). 조회 실패는 던진다(404 캐시 방지). 숫자가 아닌 id는 조회 전에 "없음".
export const getProductById = cache(async (id: number): Promise<Product | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) { log.error('getProductById', error); throw error; }
  if (!data) return null;
  const product = publicProduct(data);
  return isListed(product) ? product : null;
});

// 초안·없는 주소는 `null`(404). slug 컬럼이 아직 없으면(마이그레이션 전) 어떤 slug도 없는 것이다.
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!isValidSlug(slug)) return null;
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return null;
    log.error('getProductBySlug', error);
    throw error;
  }
  if (!data) return null;
  const product = publicProduct(data);
  return isListed(product) ? product : null;
});
