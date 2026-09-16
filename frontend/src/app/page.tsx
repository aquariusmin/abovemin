import { getAllPhotos, getProducts, getSiteSettings } from '@/lib/supabase';
import { isAvailable } from '@/lib/product';
import { cloudinaryAspect, DEFAULT_ASPECT } from '@/lib/cloudinary';
import HomeContent from '@/components/home/HomeContent';
import type { Metadata } from 'next';

// Title and description come from the root layout; only the canonical is
// missing there, because `metadataBase` alone does not emit one.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// 소품과 설정 때문에 60초. 최근 아카이브 사진도 여기 실리므로 업로드·삭제
// 때는 `revalidateArchive()`가 이 경로도 같이 무효화한다.
export const revalidate = 60;

/** 홈의 "최근 아카이브" 띠에 올릴 장수. 4열 × 2줄. */
const RECENT_COUNT = 8;

const DEFAULT_HERO_IMAGE =
  process.env.NEXT_PUBLIC_DEFAULT_HERO_IMAGE ||
  'https://res.cloudinary.com/dmljaqqzc/image/upload/v1776151998/C92CC8C0-9B98-4F63-9331-674818552AD9_4_5005_c_rxmdjn.jpg';

export default async function Home() {
  const [products, settings, photos] = await Promise.all([
    getProducts().catch(() => []),
    getSiteSettings().catch((): Record<string, string> => ({})),
    // 사진 조회가 실패해도 홈은 뜬다 — 섹션 하나가 빠질 뿐이다.
    getAllPhotos().catch(() => []),
  ]);

  // "최근"은 id가 큰 순서다. 촬영 연도로 고르면 옛 사진을 새로 올렸을 때
  // 홈이 바뀌지 않아, 업데이트가 있었다는 신호를 주지 못한다.
  const recent = photos
    .toSorted((a, b) => b.id - a.id)
    .slice(0, RECENT_COUNT)
    .map(p => ({
      id: p.id,
      src: p.src,
      title: p.title,
      location: p.location,
      year: p.year,
      album_slug: p.album_slug,
    }));
  // 닫는 띠의 숫자. 사진이 있는 앨범만 센다 — 빈 앨범은 공개된 것이 아니다.
  const photoCount = photos.length;
  const albumCount = new Set(photos.map(p => p.album_slug)).size;

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
      recent={recent}
      photoCount={photoCount}
      albumCount={albumCount}
      featured={featured.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
      }))}
    />
  );
}
