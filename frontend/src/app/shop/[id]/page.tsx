import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, getProducts } from '@/lib/supabase';
import AddToCartButton from '@/components/AddToCartButton';

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: product } = await supabase
    .from('products')
    .select('name, description')
    .eq('id', Number(id))
    .single();

  if (!product) return { title: 'Product Not Found' };

  return {
    title: product.name,
    description: product.description || `${product.name} — phorage shop`,
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', numId)
    .single();

  if (!product) notFound();

  const accentColor = "text-accent";
  const accentBg = "bg-accent";

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#333] px-4 sm:px-6 md:px-8 py-8 md:py-12 font-serif">

      {/* 뒤로가기 */}
      <div className="max-w-7xl mx-auto mb-8 md:mb-12">
        <Link href="/shop" className="text-[10px] tracking-widest uppercase text-gray-400 font-sans hover:text-black transition-colors">
          &larr; Back to Shop
        </Link>
      </div>

      {/* 상세 레이아웃 */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">

        {/* 이미지 */}
        <div className="md:col-span-7 bg-white border border-gray-100 overflow-hidden shadow-lg shadow-gray-200/50">
          <Image
            src={product.image_url}
            alt={product.name}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 58vw"
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        {/* 정보 */}
        <div className="md:col-span-5 space-y-6 md:space-y-10">
          <div className="space-y-4">
            {product.tag && (
              <span className={`inline-block px-4 py-1.5 text-[9px] uppercase tracking-widest text-white ${accentBg} rounded-sm`}>
                {product.tag}
              </span>
            )}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">{product.name}</h2>
            <p className={`text-xl md:text-2xl font-bold font-sans ${accentColor}`}>&won; {product.price.toLocaleString()}</p>
          </div>

          <div className={`h-1 w-16 ${accentBg}`}></div>

          {product.description && (
            <div className="font-sans text-sm text-gray-600 leading-relaxed space-y-4">
              <h4 className="font-serif text-lg text-black font-semibold">Story</h4>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <AddToCartButton product={product} />

          <Link href="/cart" className="block text-[9px] uppercase tracking-widest text-gray-400 hover:text-black font-sans transition-colors">
            View Cart &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
