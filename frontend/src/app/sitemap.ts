import { SITE_URL } from '@/lib/site';
import { getAlbumsWithCounts, getAllPhotos, getProducts } from '@/lib/supabase';
import { photoPagePath } from '@/lib/photo-share';
import { isAvailable } from '@/lib/product';
import { portfolioProjects } from '@/data/portfolio';
import { getPublishedNotes } from '@/lib/supabase';

const BASE = SITE_URL;

export default async function sitemap() {
  const [albums, products, notes, photos] = await Promise.all([
    getAlbumsWithCounts().catch(() => []),
    getProducts().catch(() => []),
    getPublishedNotes().catch(() => []),
    getAllPhotos().catch(() => []),
  ]);

  // Single stable timestamp per generation for content without its own date,
  // so lastmod doesn't jitter across entries within one build.
  const now = new Date();
  const sellable = products.filter(isAvailable);
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
    // 사진이 없으면 타임라인은 빈 페이지다 — 없는 내용을 신고하지 않는다.
    ...(photos.length > 0
      ? [{ url: `${BASE}/archive/timeline`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 }]
      : []),
    // 살 수 있는 물건이 하나도 없으면 /shop은 상점이 아니라 예고편이다.
    // 지금 카탈로그는 전부 ₩0 · 품절 자리표시자인데 sitemap은 이 페이지를
    // 주간 갱신 0.9로 신고하고 있었다. 값을 데이터에서 끌어오면 진짜 상품이
    // 올라오는 순간 저절로 맞는다.
    sellable.length > 0
      ? { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 }
      : { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE}/lab`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 },
  ];

  // 빈 앨범은 404다(`archive/[slug]`가 `notFound()`를 부른다). 없는 URL을
  // 신고하지 않는다.
  const albumPages = albums.filter(a => a.photo_count > 0).map(a => ({
    url: `${BASE}/archive/${a.slug}`,
    lastModified: rowDate(a),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 사진 한 장의 페이지. `getAllPhotos`가 이미 숨긴 사진과 비공개 앨범을 거르므로,
  // 여기 오르는 주소는 모두 200이다(`archive/[slug]/[id]`가 404를 내는 조건과 같다).
  //
  // `lastModified`는 적지 않는다. 공개 조회는 행의 수정 시각을 싣지 않고
  // (`publicPhoto`), 만들 때마다 바뀌는 `now`를 300개에 붙이면 검색엔진은 그
  // 신호를 믿지 않게 된다 — 틀린 날짜보다 없는 날짜가 낫다.
  const photoPages = photos.map(photo => ({
    url: `${BASE}${photoPagePath(photo)}`,
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }));

  // 상품 상세는 **초안이 아닌 것**만 올린다 — 초안은 404다(`getProducts`가
  // 이미 뺐다). 품절 상품은 페이지가 살아 있는 아카이브라 싣되, 살 수 있는
  // 상품보다 낮게 둔다. 검색에서 들어온 사람이 먼저 닿아야 하는 곳은 살 수
  // 있는 물건이다.
  const productPages = products.map(p => {
    const available = isAvailable(p);
    return {
      url: `${BASE}/shop/${p.id}`,
      lastModified: rowDate(p),
      changeFrequency: available ? ('weekly' as const) : ('monthly' as const),
      priority: available ? 0.8 : 0.4,
    };
  });

  // 글이 없는 동안 `/notes`는 404다(그 페이지가 `notFound()`를 부른다).
  // 없는 URL을 sitemap에 싣지 않도록 목록에서 끌어온다.
  const notePages = notes.length
    ? [
        {
          url: `${BASE}/notes`,
          lastModified: new Date(notes[0].date),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        },
        ...notes.map(note => ({
          url: `${BASE}/notes/${note.slug}`,
          lastModified: new Date(note.date),
          changeFrequency: 'yearly' as const,
          priority: 0.6,
        })),
      ]
    : [];

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

  return [...staticPages, ...notePages, ...portfolioPages, ...albumPages, ...photoPages, ...productPages];
}
