import type { Metadata } from 'next';
import { getProducts } from '@/lib/supabase';
import ShopCatalog from '@/components/shop/ShopCatalog';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Tangible light for your space. phorage가 엄선한 소품 컬렉션.',
  alternates: { canonical: '/shop' },
};

export default async function Shop() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let loadError = false;
  try {
    products = await getProducts();
  } catch {
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-canvas px-4 sm:px-6 md:px-8 py-12 md:py-20">
      <ShopCatalog products={products} loadError={loadError} />
    </main>
  );
}
