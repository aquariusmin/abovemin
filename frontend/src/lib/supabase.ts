import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { log } from './logger';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export const SETTINGS_CACHE_TAG = 'site-settings';

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
  year: string;
  categories: string;
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

export async function getAlbumWithPhotos(slug: string): Promise<{ album: Album; photos: Photo[] } | null> {
  const [{ data: album, error: aErr }, { data: photos, error: pErr }] = await Promise.all([
    supabase.from('albums').select('*').eq('slug', slug).single(),
    supabase.from('photos').select('*').eq('album_slug', slug).order('sort_order'),
  ]);
  if (aErr) log.warn('getAlbumWithPhotos.album', aErr);
  if (pErr) log.warn('getAlbumWithPhotos.photos', pErr);
  if (!album) return null;
  return { album, photos: photos ?? [] };
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

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) { log.error('getProducts', error); throw error; }
  return data ?? [];
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) { log.warn('getFeaturedProducts', error); return []; }
  return data ?? [];
}
