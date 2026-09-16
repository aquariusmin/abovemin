import { getProducts, getSiteSettings } from '@/lib/supabase';
import { isAvailable } from '@/lib/product';
import { cloudinaryAspect, DEFAULT_ASPECT } from '@/lib/cloudinary';
import HomeContent from '@/components/home/HomeContent';
import type { Metadata } from 'next';

// Title and description come from the root layout; only the canonical is
// missing there, because `metadataBase` alone does not emit one.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 60;

const DEFAULT_HERO_IMAGE =
  process.env.NEXT_PUBLIC_DEFAULT_HERO_IMAGE ||
  'https://res.cloudinary.com/dmljaqqzc/image/upload/v1776151998/C92CC8C0-9B98-4F63-9331-674818552AD9_4_5005_c_rxmdjn.jpg';

export default async function Home() {
  const [products, settings] = await Promise.all([
    getProducts().catch(() => []),
    getSiteSettings().catch((): Record<string, string> => ({})),
  ]);

  // 홈의 소품 섹션은 살 수 있는 것만 보여 준다. 최신 4개를 가져와 거르면
  // 판매 중인 상품이 오래된 id에 있을 때 섹션이 통째로 비므로, 전체에서
  // 거른 뒤 최신순으로 자른다 — 카탈로그가 몇 행뿐이라 비용은 같다.
  const featured = products
    .filter(isAvailable)
    .toSorted((a, b) => b.id - a.id)
    .slice(0, 4);

  const heroImage = settings['hero_image'] || DEFAULT_HERO_IMAGE;
  const heroTitle = settings['hero_title'] || 'Collecting the Greenery';
  const heroSubtitle =
    settings['hero_subtitle'] ||
    '무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록. phorage는 자연과 일상이 교차하는 지점을 기록합니다.';

  const titleHead = heroTitle.split(' ').slice(0, -1).join(' ');
  const titleTail = heroTitle.split(' ').slice(-1).join(' ');

  // The hero frame is built from the photograph's own proportions, so it never
  // crops it and never has filler space left over. Read here rather than in the
  // client component: it is one cached server request, and shipping the ratio
  // with the HTML means the frame is reserved before the image loads.
  const heroAspect = (await cloudinaryAspect(heroImage)) ?? DEFAULT_ASPECT;

  return (
    <HomeContent
      heroImage={heroImage}
      heroAspect={heroAspect}
      titleHead={titleHead}
      titleTail={titleTail}
      heroSubtitle={heroSubtitle}
      featured={featured.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
      }))}
    />
  );
}
