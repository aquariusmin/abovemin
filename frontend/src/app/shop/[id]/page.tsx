import { notFound } from 'next/navigation';
import { getProducts, getProductById } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';
import ProductGallery from '@/components/shop/ProductGallery';
import ProductPurchase from '@/components/shop/ProductPurchase';
import { cloudinaryAspect } from '@/lib/cloudinary';
import { isOptionAvailable, parseImages, priceRange, publicState, SOLD_OUT_LABEL } from '@/lib/product';
import BackLink from '@/components/BackLink';

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
// 초안은 `getProducts`가 이미 뺐다 — 미리 굽지 않고, 요청이 와도 404다.
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
      ...(product.image_url ? { images: [{ url: product.images?.[0]?.url ?? product.image_url }] } : {}),
    },
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  // 초안이면 null이 온다(`getProductById`) — 주소를 알아도 열리지 않는다.
  const product = await getProductById(numId);
  if (!product) notFound();

  const state = publicState(product);
  const soldOut = state !== 'available';
  const options = product.options ?? [];
  const range = priceRange(product);
  const images = parseImages(product.images, product.image_url);

  // 사진마다 비율을 서버에서 읽는다(하루 캐시). 프레임을 사진 모양으로 만들고
  // 이미지보다 먼저 자리를 잡기 위해서다. Cloudinary가 아닌 주소(자리표시자의
  // Unsplash)는 null — 갤러리가 이미지 자신의 크기로 그린다.
  const aspects = await Promise.all(images.map(image => cloudinaryAspect(image.url)));
  const gallery = images.map((image, i) => ({ ...image, aspect: aspects[i] }));

  // `offers` only when there is a price to offer. A product still waiting on
  // one carries `price: 0`, and an Offer saying a thing costs ₩0 is a claim,
  // not a placeholder — search engines render it as free. Omitting the node
  // says "no offer yet", which is what is true.
  //
  // 옵션 상품은 옵션마다 Offer 하나. 가격이 정해진 옵션만 싣는다.
  const availability = (inStock: boolean) =>
    inStock && !soldOut ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const offers = options.length
    ? options
        .filter(option => option.price > 0)
        .map(option => ({
          '@type': 'Offer',
          name: option.label,
          price: option.price,
          priceCurrency: 'KRW',
          availability: availability(isOptionAvailable(option)),
        }))
    : product.price > 0
    ? [{ '@type': 'Offer', price: product.price, priceCurrency: 'KRW', availability: availability(true) }]
    : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: images.map(image => image.url),
    description: product.description || `${product.name} — phorage shop`,
    ...(offers.length === 1 ? { offers: offers[0] } : offers.length > 1 ? { offers } : {}),
  };

  return (
    <main className="min-h-screen bg-canvas px-5 sm:px-6 md:px-10 py-12 md:py-20">
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
        <BackLink href="/shop">샵으로</BackLink>
      </div>

      {/* Detail layout */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">

        {/* Media — 프레임은 사진을 따른다(ProductGallery 주석). */}
        <Reveal className="md:col-span-7" y={16}>
          <ProductGallery images={gallery} name={product.name} />
        </Reveal>

        {/* Info */}
        <Reveal className="md:col-span-5 space-y-6 md:space-y-8" delay={0.08} y={16}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {product.category && (
                <>
                  <p className="eyebrow text-muted-foreground">{product.category}</p>
                  <span aria-hidden className="h-3 w-px bg-hairline" />
                </>
              )}
              {/* Hangul은 eyebrow의 대문자·0.24em 자간을 받지 않는다 → label-ko.
                  초안은 이 페이지에 오지 않으므로 상태는 둘뿐이다. */}
              <span className={`label-ko ${soldOut ? 'text-muted-foreground' : 'text-accent'}`}>
                {soldOut ? SOLD_OUT_LABEL : '판매 중'}
              </span>
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-medium tracking-tight leading-[1.05] text-ink">
              {product.name}
            </h1>
            {product.edition && (
              <p className="text-[15px] text-slate">{product.edition}</p>
            )}
          </div>

          <ProductPurchase
            product={{ id: product.id, name: product.name, price: product.price, image_url: images[0]?.url ?? product.image_url }}
            options={options}
            priceMin={range.min}
            priceMax={range.max}
            soldOut={soldOut}
          />

          {product.description && (
            <>
              <hr className="rule" />
              <div className="space-y-3">
                <p className="eyebrow text-muted-foreground">Story</p>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-body break-keep">
                  {product.description}
                </p>
              </div>
            </>
          )}
        </Reveal>
      </section>
    </main>
  );
}
