import { getAlbums, getProducts } from '@/lib/supabase';

const BASE = 'https://abovemin.com';

export default async function sitemap() {
  const [albums, products] = await Promise.all([
    getAlbums().catch(() => []),
    getProducts().catch(() => []),
  ]);

  const staticPages = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/archive`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/shop`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/lab`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
  ];

  const albumPages = albums.map(a => ({
    url: `${BASE}/archive/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const productPages = products.map(p => ({
    url: `${BASE}/shop/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...albumPages, ...productPages];
}
