import { getAlbums, getProducts } from '@/lib/supabase';
import { portfolioProjects } from '@/data/portfolio';

const BASE = 'https://abovemin.com';

export default async function sitemap() {
  const [albums, products] = await Promise.all([
    getAlbums().catch(() => []),
    getProducts().catch(() => []),
  ]);

  // Single stable timestamp per generation for content without its own date,
  // so lastmod doesn't jitter across entries within one build.
  const now = new Date();
  // Use a row's DB timestamp when present (Supabase default columns), else `now`.
  const rowDate = (row: unknown): Date => {
    const ts = (row as { updated_at?: string; created_at?: string });
    const raw = ts.updated_at ?? ts.created_at;
    return raw ? new Date(raw) : now;
  };

  const staticPages = [
    { url: BASE, lastModified: now, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE}/portfolio`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE}/ko/portfolio`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE}/archive`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/lab`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
  ];

  const albumPages = albums.map(a => ({
    url: `${BASE}/archive/${a.slug}`,
    lastModified: rowDate(a),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const productPages = products.map(p => ({
    url: `${BASE}/shop/${p.id}`,
    lastModified: rowDate(p),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const portfolioPages = portfolioProjects.flatMap(project => [
    {
      url: `${BASE}/portfolio/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${BASE}/ko/portfolio/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ]);

  return [...staticPages, ...portfolioPages, ...albumPages, ...productPages];
}
