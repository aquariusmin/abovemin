import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, getProducts } from '@/lib/supabase';
import AddToCartButton from '@/components/AddToCartButton';
import Reveal from '@/components/motion/Reveal';

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url,
    description: product.description || `${product.name} — phorage shop`,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'KRW',
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main className="min-h-screen bg-canvas px-4 sm:px-6 md:px-8 py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <div className="max-w-6xl mx-auto mb-8 md:mb-12">
        <Link href="/shop" className="link-underline text-sm text-slate">
          ← Back to Shop
        </Link>
      </div>

      {/* Detail layout */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">

        {/* Media */}
        <Reveal className="md:col-span-7 glass overflow-hidden rounded-lg" y={16}>
          <Image
            src={product.image_url}
            alt={product.name}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 58vw"
            className="w-full h-auto object-cover"
            priority
          />
        </Reveal>

        {/* Info */}
        <Reveal className="md:col-span-5 space-y-6 md:space-y-8" delay={0.08} y={16}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="eyebrow text-muted">{product.category}</p>
              <span aria-hidden className="h-3 w-px bg-hairline" />
              <span className={`eyebrow ${product.in_stock ? 'text-accent' : 'text-muted'}`}>
                {product.in_stock ? 'In stock' : 'Sold out'}
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-[1.05] text-ink break-keep">
              {product.name}
            </h1>
            <p className="text-2xl font-semibold text-accent tabular-nums">₩ {product.price.toLocaleString()}</p>
          </div>

          <hr className="rule" />

          {product.description && (
            <div className="space-y-3">
              <p className="eyebrow text-muted">Story</p>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-body break-keep">
                {product.description}
              </p>
            </div>
          )}

          <AddToCartButton product={product} />

          <div className="flex items-center gap-5 pt-1">
            <Link href="/cart" className="link-underline text-sm text-slate">
              View Cart →
            </Link>
            <Link href="/shop" className="link-underline text-sm text-slate">
              Continue browsing
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
