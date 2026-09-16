import { getAllPhotos, getProducts, getSiteSettings } from '@/lib/supabase';
import { isAvailable } from '@/lib/product';
import { cloudinaryAspect, DEFAULT_ASPECT } from '@/lib/cloudinary';
import HomeContent from '@/components/home/HomeContent';
import { onThisDay, seoulToday } from '@/lib/on-this-day';
import type { Metadata } from 'next';

// Title and description come from the root layout; only the canonical is
// missing there, because `metadataBase` alone does not emit one.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// 소품과 설정 때문에 60초. 최근 아카이브 사진도 여기 실리므로 업로드·삭제
// 때는 `revalidateArchive()`가 이 경로도 같이 무효화한다.
//
// "몇 년 전 오늘"도 이 주기에 기댄다. 날짜는 렌더하는 순간 **서버에서** 서울
// 기준으로 계산하므로(`seoulToday`), 페이지가 구워진 날짜가 곧 섹션의 날짜다.
// 그래서 이 값은 하루보다 훨씬 짧아야 한다 — `revalidate`를 하루 이상으로
// 올리거나 `false`로 두면, 자정을 넘긴 뒤에도 어제의 "오늘"이 최대 그만큼
// 남는다. ISR은 만료 뒤 첫 요청에 옛 페이지를 한 번 주고 다시 굽기 때문에,
// 자정 직후의 방문자 한 명은 어제 것을 볼 수 있다. 60초 주기에서는 그 창이
// "자정 뒤 첫 방문 한 번"으로 줄어든다. 클라이언트에서 날짜를 계산하지 않는
// 이유: 서버 HTML과 첫 화면이 어긋나고(하이드레이션 불일치), 사진 목록 전체를
// 브라우저로 보내야 한다.
export const revalidate = 60;

/** "몇 년 전 오늘"에 올릴 최대 장수. 한 줄로 끝나는 작은 섹션이다. */
const MEMORY_COUNT = 6;

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
      // 비율로만 쓴다 — 흐린 미리보기 칸을 사진보다 먼저 잡는다.
      width: p.width ?? null,
      height: p.height ?? null,
    }));

  // 몇 년 전 오늘. 맞는 사진이 없으면 빈 목록이고, 섹션이 통째로 빠진다.
  const { memories } = onThisDay(photos, seoulToday(new Date()), { limit: MEMORY_COUNT });
  const onThisDayPhotos = memories.map(({ photo: p, yearsAgo, exact }) => ({
    id: p.id,
    src: p.src,
    title: p.title,
    location: p.location,
    year: p.year,
    album_slug: p.album_slug,
    width: p.width ?? null,
    height: p.height ?? null,
    taken_at: p.taken_at ?? null,
    yearsAgo,
    exact,
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
      onThisDay={onThisDayPhotos}
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
