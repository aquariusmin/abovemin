import type { Metadata } from 'next';
import { getProducts } from '@/lib/supabase';
import ShopCatalog, { type CatalogItem } from '@/components/shop/ShopCatalog';
import { priceRange, publicState } from '@/lib/product';
import { cloudinaryAspect } from '@/lib/cloudinary';
import { buildFallback } from '@/lib/build-phase';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Tangible light for your space. phorage가 엄선한 소품 컬렉션.',
  alternates: { canonical: '/shop' },
};

export default async function Shop() {
  // 조회 실패를 여기서 잡아 "불러오지 못했습니다"를 그리면, 그 화면이 ISR
  // 캐시에 앉아 60초 동안 멀쩡한 목록 대신 나간다. 던지면 Next가 마지막으로
  // 성공한 목록을 계속 내보내고 다음 요청에서 다시 시도한다. 빌드 중에는
  // 내보낼 이전 페이지가 없으므로 그때만 오류 화면으로 굽는다(`buildFallback`).
  const loaded = await getProducts().catch(buildFallback(null));
  const loadError = loaded === null;
  // `getProducts`는 초안을 이미 뺐다. 여기서는 카드가 그리는 값만 남긴다 —
  // 옵션 배열·설명 전문을 클라이언트 컴포넌트의 props(= HTML 속 RSC
  // 페이로드)로 실을 이유가 없다.
  const list = loaded ?? [];
  // 카드 사진의 비율을 서버에서 읽는다(하루 캐시) — 상세 페이지와 같은 방식.
  // 목록은 열 기반 masonry라, 비율 없이 그리면 사진이 올 때마다 그 열의 아래
  // 카드가 사진 높이만큼 밀려 내려간다. 못 읽으면 null — 카드는 예전처럼
  // 사진이 온 뒤에 높이를 얻는다.
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
