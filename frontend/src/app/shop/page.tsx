import type { Metadata } from 'next';
import { getProducts } from '@/lib/supabase';
import ShopCatalog, { type CatalogItem } from '@/components/shop/ShopCatalog';
import { priceRange, publicState } from '@/lib/product';
import { cloudinaryAspect } from '@/lib/cloudinary';
import { buildFallback } from '@/lib/build-phase';
import { sectionTitle, shareCard } from '@/lib/share-card';

export const revalidate = 60;

const TITLE = 'Shop';
const DESCRIPTION = 'phorage의 사진으로 만든 엽서, 달력, 포스터.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/shop' },
  ...shareCard({ title: sectionTitle(TITLE), description: DESCRIPTION, path: '/shop' }),
};

export default async function Shop() {
  // 조회 실패는 던진다 — 잡으면 오류 화면이 ISR 캐시에 앉는다. 빌드 중에만 오류 화면으로 굽는다.
  const loaded = await getProducts().catch(buildFallback(null));
  const loadError = loaded === null;
  // 카드가 그리는 값만 클라이언트 props(RSC 페이로드)로 넘긴다.
  const list = loaded ?? [];
  // 비율을 먼저 읽어 masonry 칸을 잡는다 — 없으면 사진이 올 때마다 아래 카드가 밀린다.
  const covers = list.map(product => product.images?.[0]?.url ?? product.image_url);
  const aspects = await Promise.all(covers.map(url => (url ? cloudinaryAspect(url) : null)));
  const products: CatalogItem[] = list.map((product, i) => {
    const { min, max } = priceRange(product);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      tag: product.tag,
      image_url: covers[i],
      aspect: aspects[i],
      edition: product.edition ?? null,
      state: publicState(product) === 'available' ? 'available' : 'sold_out',
      price: product.price,
      priceMin: min,
      priceMax: max,
      hasOptions: (product.options?.length ?? 0) > 0,
    };
  });

  return (
    <main className="min-h-screen bg-canvas px-5 sm:px-6 md:px-10 py-14 md:py-24">
      <ShopCatalog products={products} loadError={loadError} />
    </main>
  );
}
