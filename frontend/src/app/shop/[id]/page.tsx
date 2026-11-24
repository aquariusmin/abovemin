import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProducts, getProductById } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';
import ProductGallery from '@/components/shop/ProductGallery';
import ProductPurchase from '@/components/shop/ProductPurchase';
import { parseDescriptionSections, splitProductDescription } from '@/lib/product-specs';
import { PackageSection, ProductDescriptionBody, sectionSlot } from '@/components/shop/ProductDescription';
import RelatedProducts, { type RelatedItem } from '@/components/shop/RelatedProducts';
import { cloudinaryAspect, cloudinaryOgImage, OG_HEIGHT, OG_WIDTH } from '@/lib/cloudinary';
import { shareCard } from '@/lib/share-card';
import { isOptionAvailable, parseImages, priceRange, publicState, relatedProducts, SOLD_OUT_LABEL } from '@/lib/product';
import BackLink from '@/components/BackLink';
import { displayFace, labelFace } from '@/lib/typography';

export const revalidate = 60;

// 조회 실패는 빈 배열 — 배포 순간 Supabase가 흔들려도 빌드가 죽지 않게(dynamicParams가 받친다).
export async function generateStaticParams() {
  const products = await getProducts().catch(() => []);
  return products.map(p => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(Number(id));

  if (!product) return { title: 'Product Not Found' };

  const description = product.description || `${product.name} — phorage shop`;
  const path = `/shop/${id}`;
  // 저장된 주소를 그대로 실으면 원본 크기나 크롤러가 못 읽는 f_auto 포맷이 간다 — 1200×630 JPG로.
  const stored = product.images?.[0]?.url ?? product.image_url;
  const og = stored ? cloudinaryOgImage(stored) : null;
  const images = og
    ? [{ url: og, width: OG_WIDTH, height: OG_HEIGHT, alt: product.name }]
    : stored
      ? [{ url: stored, alt: product.name }]
      : undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    // 일부만 적으면 루트의 siteName·locale이 사라진다(얕은 병합, `shareCard`).
    ...shareCard({ title: product.name, description, path, images }),
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const product = await getProductById(numId);
  if (!product) notFound();

  const state = publicState(product);
  const soldOut = state !== 'available';
  // `[제목]` 섹션이 있으면 긴 설명은 사진·구매 영역 아래로 내린다. 없으면 예전처럼 구매 영역 안에 둔다.
  const sections = parseDescriptionSections(product.description ?? '');
  const { story, specs } = sections ? { story: '', specs: [] } : splitProductDescription(product.description ?? '');
  const packageSection = sections?.find(section => sectionSlot(section) === 'package');
  const bodySections = sections?.filter(section => section !== packageSection) ?? [];
  const options = product.options ?? [];
  const range = priceRange(product);
  const images = parseImages(product.images, product.image_url);

  const aspects = await Promise.all(images.map(image => cloudinaryAspect(image.url)));
  const gallery = images.map((image, i) => ({ ...image, aspect: aspects[i] }));

  // 다른 상품 변경은 revalidateShop이 상세 페이지 전부를 무효화한다. 조회 실패 시 구역만 뺀다.
  const relatedIds = product.related_ids ?? [];
  const catalog = await getProducts().catch(() => []);
  const directOrder =
    !soldOut && catalog.filter(item => publicState(item) === 'available').length === 1;
  const related: RelatedItem[] = relatedProducts(relatedIds, catalog, product.id).map(item => {
    const { min, max } = priceRange(item);
    return {
      id: item.id,
      name: item.name,
      image_url: item.images?.[0]?.url ?? item.image_url,
      state: publicState(item) === 'available' ? 'available' : 'sold_out',
      price: item.price,
      priceMin: min,
      priceMax: max,
      hasOptions: (item.options?.length ?? 0) > 0,
    };
  });

  // No Offer at price 0 — search engines would render it as free. Addons are not offers.
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
      {/* JSON.stringify doesn't escape `<` — rewrite it so "</script>" in a name can't end the element. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-6xl mx-auto mb-8 md:mb-12">
        <BackLink href="/shop">샵으로</BackLink>
      </div>

      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">

        <Reveal className="md:col-span-7" y={16}>
          <ProductGallery images={gallery} name={product.name} />
        </Reveal>

        <Reveal className="md:col-span-5 space-y-6 md:space-y-8" delay={0.08} y={16}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {product.category && (
                <>
                  <p className={`${labelFace(product.category)} text-muted-foreground`}>{product.category}</p>
                  <span aria-hidden className="h-3 w-px bg-hairline" />
                </>
              )}
              <span className={`label-ko ${soldOut ? 'text-muted-foreground' : 'text-accent'}`}>
                {soldOut ? SOLD_OUT_LABEL : '판매 중'}
              </span>
            </div>
            <h1 className={`${displayFace(product.name)} text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink`}>
              {product.name}
            </h1>
            {product.edition && (
              <p className="text-[15px] text-slate">{product.edition}</p>
            )}
          </div>

          {packageSection && (
            <>
              <hr className="rule" />
              <PackageSection section={packageSection} />
            </>
          )}

          <ProductPurchase
            product={{ id: product.id, name: product.name, price: product.price, image_url: images[0]?.url ?? product.image_url }}
            options={options}
            addons={product.addons ?? []}
            priceMin={range.min}
            priceMax={range.max}
            soldOut={soldOut}
            directOrder={directOrder}
          />

          {(story || specs.length > 0) && (
            <>
              <hr className="rule" />
              {story && (
                <div className="space-y-3">
                  <p className="eyebrow text-muted-foreground">Story</p>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-body break-keep">
                    {story}
                  </p>
                </div>
              )}
              {specs.length > 0 && (
                <div className="space-y-3">
                  <p className="eyebrow text-muted-foreground">Details</p>
                  <dl className="divide-y divide-hairline border-y border-hairline">
                    {specs.map((spec, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                        <dt className="label-ko text-slate">{spec.label}</dt>
                        <dd className="text-[15px] text-ink-body tabular-nums">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}

          {!soldOut && (
            <section aria-labelledby="order-steps" className="rounded-lg surface-cream p-5 md:p-6">
              <h2 id="order-steps" className="eyebrow text-slate">How to order</h2>
              <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-body">
                {[
                  ['주문서 작성', '이름과 연락처를 적고, 택배와 대면 전달 중에서 고릅니다.'],
                  ['입금 안내', '주문하면 입금할 금액과 계좌가 화면에 바로 나옵니다.'],
                  ['확인 후 전달', '입금이 확인되면 택배로 보내고, 대면 전달은 추후 연락드립니다.'],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground"
                    >
                      {index + 1}
                    </span>
                    <p>
                      <span className="font-medium text-ink">{title}</span>
                      <span className="text-slate"> — {body}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </Reveal>
      </section>

      {bodySections.length > 0 && <ProductDescriptionBody sections={bodySections} />}

      {related.length > 0 && <RelatedProducts items={related} />}
    </main>
  );
}
