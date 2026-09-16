import type { Metadata } from 'next';
import { getProducts } from '@/lib/supabase';
import ShopCatalog, { type CatalogItem } from '@/components/shop/ShopCatalog';
import { priceRange, publicState } from '@/lib/product';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Tangible light for your space. phorage가 엄선한 소품 컬렉션.',
  alternates: { canonical: '/shop' },
};

export default async function Shop() {
  let products: CatalogItem[] = [];
  let loadError = false;
  try {
    // `getProducts`는 초안을 이미 뺐다. 여기서는 카드가 그리는 값만 남긴다 —
    // 옵션 배열·설명 전문을 클라이언트 컴포넌트의 props(= HTML 속 RSC
    // 페이로드)로 실을 이유가 없다.
    products = (await getProducts()).map(product => {
      const { min, max } = priceRange(product);
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        tag: product.tag,
        image_url: product.images?.[0]?.url ?? product.image_url,
        edition: product.edition ?? null,
        state: publicState(product) === 'available' ? 'available' : 'sold_out',
        price: product.price,
        priceMin: min,
        priceMax: max,
        hasOptions: (product.options?.length ?? 0) > 0,
      };
    });
  } catch {
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-canvas px-5 sm:px-6 md:px-10 py-14 md:py-24">
      <ShopCatalog products={products} loadError={loadError} />
    </main>
  );
}
