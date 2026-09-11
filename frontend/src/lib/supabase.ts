import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { log } from './logger';
import { SETTINGS_CACHE_TAG } from './cache-tags';

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
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  tag: string | null;
  description: string;
  in_stock: boolean;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function getAlbums(): Promise<Album[]> {
  const { data, error } = await supabase.from('albums').select('*').order('sort_order');
  if (error) { log.error('getAlbums', error); throw error; }
  return data ?? [];
}

// Albums with their photo counts in TWO queries (not N+1): fetch every photo's
// album_slug once and tally in JS. `cache()` dedups within a single request.
export const getAlbumsWithCounts = cache(async (): Promise<Array<Album & { photo_count: number }>> => {
  const [{ data: albums, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
    supabase.from('albums').select('*').order('sort_order'),
    supabase.from('photos').select('album_slug'),
  ]);
  if (aErr) { log.error('getAlbumsWithCounts.albums', aErr); throw aErr; }
  if (pErr) log.warn('getAlbumsWithCounts.photos', pErr);
  const counts: Record<string, number> = {};
  for (const p of photos ?? []) counts[p.album_slug] = (counts[p.album_slug] ?? 0) + 1;
  return (albums ?? []).map(a => ({ ...a, photo_count: counts[a.slug] ?? 0 }));
});

// Wrapped in cache() so generateMetadata + the page body share one query per request.
export const getAlbumWithPhotos = cache(
  async (slug: string): Promise<{ album: Album; photos: Photo[] } | null> => {
    const [{ data: album, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
      supabase.from('albums').select('*').eq('slug', slug).single(),
      supabase.from('photos').select('*').eq('album_slug', slug).order('sort_order'),
    ]);
    if (aErr) log.warn('getAlbumWithPhotos.album', aErr);
    if (pErr) log.warn('getAlbumWithPhotos.photos', pErr);
    if (!album) return null;
    return { album, photos: photos ?? [] };
  },
);

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
      supabase.from('photos').select('*').order('year', { ascending: false }).order('sort_order'),
      supabase.from('albums').select('slug, title'),
    ]);
    if (pErr) { log.error('getAllPhotos.photos', pErr); throw pErr; }
    if (aErr) log.warn('getAllPhotos.albums', aErr);

    const titles = new Map((albums ?? []).map(a => [a.slug as string, a.title as string]));
    return (photos ?? []).map(photo => ({
      ...photo,
      album_title: titles.get(photo.album_slug) ?? photo.album_slug,
    }));
  },
);

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) { log.error('getProducts', error); throw error; }
  return data ?? [];
}

// Single product by id. Wrapped in cache() so generateMetadata + the page body
// share one query per request instead of fetching the same product twice.
export const getProductById = cache(async (id: number): Promise<Product | null> => {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) return null;
  return data;
});

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) { log.warn('getFeaturedProducts', error); return []; }
  return data ?? [];
}
