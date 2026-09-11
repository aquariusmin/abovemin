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
  const sellable = products.filter(p => p.in_stock);
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
    { url: `${BASE}/en/portfolio`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE}/archive`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    // 살 수 있는 물건이 하나도 없으면 /shop은 상점이 아니라 예고편이다.
    // 지금 카탈로그는 전부 ₩0 · 품절 자리표시자인데 sitemap은 이 페이지를
    // 주간 갱신 0.9로 신고하고 있었다. 값을 데이터에서 끌어오면 진짜 상품이
    // 올라오는 순간 저절로 맞는다.
    sellable.length > 0
      ? { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 }
      : { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE}/lab`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
  ];

  const albumPages = albums.map(a => ({
    url: `${BASE}/archive/${a.slug}`,
    lastModified: rowDate(a),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 같은 이유로 상품 상세도 판매 가능한 것만 올린다. 살 수 없는 페이지를
  // 색인에 밀어 넣으면 검색에서 들어온 사람이 품절 화면에 도착한다.
  const productPages = sellable.map(p => ({
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
      url: `${BASE}/en/portfolio/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ]);

  return [...staticPages, ...portfolioPages, ...albumPages, ...productPages];
}
