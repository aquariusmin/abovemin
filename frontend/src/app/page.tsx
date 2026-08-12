import { getFeaturedProducts, getSiteSettings } from '@/lib/supabase';
import { cloudinaryAspect, DEFAULT_ASPECT } from '@/lib/cloudinary';
import HomeContent from '@/components/home/HomeContent';

export const revalidate = 60;

const DEFAULT_HERO_IMAGE =
  process.env.NEXT_PUBLIC_DEFAULT_HERO_IMAGE ||
  'https://res.cloudinary.com/dmljaqqzc/image/upload/v1776151998/C92CC8C0-9B98-4F63-9331-674818552AD9_4_5005_c_rxmdjn.jpg';

export default async function Home() {
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(4),
    getSiteSettings().catch((): Record<string, string> => ({})),
  ]);

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
