import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getAlbumWithPhotos(slug: string): Promise<{ album: Album; photos: Photo[] } | null> {
  const [{ data: album }, { data: photos }] = await Promise.all([
    supabase.from('albums').select('*').eq('slug', slug).single(),
    supabase.from('photos').select('*').eq('album_slug', slug).order('sort_order'),
  ]);
  if (!album) return null;
  return { album, photos: photos ?? [] };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id');
  if (error) throw error;
  return data ?? [];
}
