import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts, getProductById } from '@/lib/supabase';
import AddToCartButton from '@/components/AddToCartButton';
import Reveal from '@/components/motion/Reveal';
import { formatPrice } from '@/lib/price';

export const revalidate = 60;

/**
 * 빌드 시점에 미리 구울 상품 목록.
 *
 * 조회가 실패하면 빈 배열을 준다. 이게 없으면 배포 순간 Supabase가 잠깐
 * 흔들리기만 해도 **빌드 전체가 죽는다** — 실제로 `Failed to collect page data`로
 * 확인했다. 사이트의 다른 모든 부분은 데이터가 없는 경우를 이미 처리하고
 * 있는데(빈 상태·에러 상태, `sitemap.ts`의 `.catch(() => [])`) 여기만
 * 예외였다.
 *
 * 빈 배열이어도 라우트가 사라지지는 않는다. `dynamicParams`가 기본으로 켜져
 * 있어 첫 요청 때 서버에서 그려지고, 그 뒤로는 평소의 ISR을 탄다. 미리 굽지
 * 못하는 것이 배포에 실패하는 것보다 낫다.
 */
export async function generateStaticParams() {
  const products = await getProducts().catch(() => []);
  return products.map(p => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(Number(id));

  if (!product) return { title: 'Product Not Found' };

  const description = product.description || `${product.name} — phorage shop`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${id}` },
    openGraph: {
      title: product.name,
      description,
      ...(product.image_url ? { images: [{ url: product.image_url }] } : {}),
    },
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const product = await getProductById(numId);
  if (!product) notFound();

  // `offers` only when there is a price to offer. A product still waiting on
  // one carries `price: 0`, and an Offer saying a thing costs ₩0 is a claim,
  // not a placeholder — search engines render it as free. Omitting the node
  // says "no offer yet", which is what is true.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url,
    description: product.description || `${product.name} — phorage shop`,
    ...(product.price > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'KRW',
            availability: product.in_stock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };

  return (
    <main className="min-h-screen bg-canvas px-4 sm:px-6 md:px-8 py-12 md:py-20">
      {/* `JSON.stringify` does not escape `<`, and the contents of a <script>
          element are not HTML-parsed — the browser just scans for the closing
          tag. A product name containing "</script>" would therefore end this
          element early and let the rest of the field render as markup. Rewriting
          every "<" as its JSON unicode escape parses back to exactly the same
          object while removing the only sequence that can end the element. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
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
        <Reveal className="md:col-span-7 overflow-hidden rounded-lg border border-border-light bg-stone" y={16}>
          <Image
            src={product.image_url}
            alt={product.name}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 58vw"
            className="w-full h-auto object-cover"
            /* The product shot is this page's LCP element at every width, so
               `preload` is the correct Next 16 replacement for the deprecated
               `priority` — unlike the grids, where it is not. */
            preload
          />
        </Reveal>

        {/* Info */}
        <Reveal className="md:col-span-5 space-y-6 md:space-y-8" delay={0.08} y={16}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="eyebrow text-muted-foreground">{product.category}</p>
              <span aria-hidden className="h-3 w-px bg-hairline" />
              <span className={`eyebrow ${product.in_stock ? 'text-accent' : 'text-muted-foreground'}`}>
                {product.in_stock ? 'In stock' : 'Sold out'}
              </span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-[1.05] text-ink break-keep">
              {product.name}
            </h1>
            <p className="text-2xl font-semibold text-accent tabular-nums">{formatPrice(product.price)}</p>
          </div>

          <hr className="rule" />

          {product.description && (
            <div className="space-y-3">
              <p className="eyebrow text-muted-foreground">Story</p>
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
