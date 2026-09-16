import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPhotos, getPhotoInAlbum, type Photo } from '@/lib/supabase';
import { cloudinary, cloudinaryAspect, cloudinaryOgImage, DEFAULT_ASPECT, OG_HEIGHT, OG_WIDTH } from '@/lib/cloudinary';
import { displayCamera, exifParts, joinCaption, photoCaption, photoLabel, takenDate } from '@/lib/caption';
import { photoPageDescription, photoPagePath, photoPageTitle, printInquiryMailto } from '@/lib/photo-share';
import { cameraArchiveHref } from '@/lib/camera';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import BackLink from '@/components/BackLink';
import CopyLinkButton from '@/components/archive/CopyLinkButton';
import PhotoKeyNav from '@/components/archive/PhotoKeyNav';
import { placeholderStyle } from '@/components/photo-placeholder';

/**
 * 사진 한 장의 페이지.
 *
 * 라이트박스(`?p=`)는 앨범 안에서 넘겨 보기에는 맞지만, 사진 한 장을 **건네기**
 * 에는 맞지 않았다: 링크 미리보기에는 앨범 표지가 뜨고, 받은 사람은 앨범 전체를
 * 내려받은 뒤에야 그 사진을 보고, 검색엔진에는 사진 한 장짜리 문서가 없다.
 * 이 페이지가 그 주소다. 라이트박스의 "링크 복사"와 프린트 문의도 이제 여기를
 * 가리키고, 예전에 건넨 `?p=` 링크는 앨범 페이지가 계속 연다.
 */

// 앨범 페이지와 같다: 사진이 바뀌는 순간 `revalidateArchive()`가 이 경로를
// 무효화하고, 300초는 그 신호를 놓쳤을 때의 안전망이다.
export const revalidate = 300;

type Params = Promise<{ slug: string; id: string }>;

/**
 * 주소의 id를 숫자로. `012`나 `12.0`처럼 같은 사진을 다른 문자열로 부르는 주소는
 * 받지 않는다 — 한 사진에 URL이 여러 개면 canonical이 흐려진다.
 */
function parsePhotoId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

async function findPhoto(params: Params) {
  const { slug, id } = await params;
  const photoId = parsePhotoId(id);
  if (photoId === null) return null;
  return getPhotoInAlbum(slug, photoId);
}

/**
 * 빌드 시점에 미리 구울 사진 목록. 공개 앨범의 숨기지 않은 사진 전부(약 300장).
 *
 * 앨범 페이지와 같은 이유로 조회 실패는 빈 배열이다 — 배포 순간 Supabase가
 * 흔들렸다고 빌드 전체가 죽지 않게. 비어도 라우트는 남아서(`dynamicParams`
 * 기본값) 첫 요청 때 그려지고 그 뒤로 ISR을 탄다.
 */
export async function generateStaticParams() {
  const photos = await getAllPhotos().catch(() => []);
  return photos.map(photo => ({ slug: photo.album_slug, id: String(photo.id) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await findPhoto(params);
  if (!found) return { title: 'Photo Not Found' };
  const { album, photo } = found;

  const { title } = photoPageTitle(photo);
  const fullTitle = `${title} — ${album.title}`;
  const description = photoPageDescription(photo, album.title);
  const path = photoPagePath(photo);
  // 링크 미리보기는 자르지 않은 1200×630(`cloudinaryOgImage`의 주석). Cloudinary가
  // 아닌 주소면 크기를 모르므로 원본을 그대로 싣는다.
  const og = cloudinaryOgImage(photo.src);
  const image = og
    ? { url: og, width: OG_WIDTH, height: OG_HEIGHT, alt: photoLabel(photo) }
    : { url: photo.src, alt: photoLabel(photo) };

  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    // `openGraph`·`twitter`는 부모 것을 통째로 갈아 끼우므로(얕은 병합) 사이트
    // 이름과 언어를 다시 적는다. 이미지를 적지 않으면 루트의 `opengraph-image`가
    // 이 사진 대신 사이트 카드를 보여 준다.
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: 'phorage',
      locale: 'ko_KR',
      type: 'article',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

/**
 * 프레임 비율. 저장된 크기가 있으면 그 비율(크기 자체는 뜻이 없다 — 원본이
 * 1500px 안팎으로 줄어 있다), 없으면 Cloudinary에 한 번 묻는다(하루 캐시).
 */
async function frameRatio(photo: Photo): Promise<number> {
  if (photo.width && photo.height) return photo.width / photo.height;
  return (await cloudinaryAspect(photo.src)) ?? DEFAULT_ASPECT;
}

/** 프레임 높이의 상한(뷰포트 비율). 사진이 먼저 보이고, 캡션은 스크롤 한 번 아래. */
const FRAME_VH = 74;

export default async function PhotoPage({ params }: { params: Params }) {
  const found = await findPhoto(params);
  // 숨긴 사진, 비공개 앨범, 모르는 id, 다른 앨범의 사진 — 모두 여기서 404.
  if (!found) notFound();
  const { album, photo, index, total, prev, next } = found;

  const ratio = await frameRatio(photo);
  const caption = photoCaption(photo);
  const { title, repeatsLocation } = photoPageTitle(photo);
  const label = photoLabel(photo);
  const path = photoPagePath(photo);
  const taken = takenDate(photo.taken_at);
  const camera = displayCamera(photo.camera);
  // 촬영일과 카메라는 따로 줄을 가지므로, 설정 줄에는 나머지만.
  const settings = exifParts({
    focal_length: photo.focal_length,
    aperture: photo.aperture,
    shutter: photo.shutter,
    iso: photo.iso,
  });
  const location = repeatsLocation ? null : caption.location;
  const inquiryHref = printInquiryMailto(CONTACT_EMAIL, photo, `${SITE_URL}${path}`);

  // 가장 넓게 그려질 때의 CSS 폭. `sizes`가 이보다 크면 세로 사진이 좁은 기둥에
  // 가로 사진만큼의 픽셀을 받아 온다(홈 히어로의 `heroWidth`와 같은 이유).
  const maxWidth = Math.min(1400, Math.round(ratio * 900 * (FRAME_VH / 100)));
  const prevHref = prev ? photoPagePath(prev) : null;
  const nextHref = next ? photoPagePath(next) : null;

  return (
    <main className="px-5 sm:px-6 md:px-10 pt-6 md:pt-10 pb-16 md:pb-24 min-h-screen bg-canvas text-ink-body">
      <PhotoKeyNav prevHref={prevHref} nextHref={nextHref} />

      <div className="max-w-[1400px] mx-auto">
        <div className="mb-5 md:mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <BackLink href={`/archive/${album.slug}`}>{album.title}</BackLink>
          <p className="eyebrow text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </p>
        </div>

        {/* 프레임과 캡션이 같은 폭을 쓴다. 폭은 사진의 비율로 정한다 —
            `min(100%, 비율 × 74svh)`. 가로 사진은 컨테이너를 채우고, 세로 사진은
            화면 높이에 맞춰 가운데 기둥이 된다. 자르지도, 남는 띠를 채우지도 않는다
            (DESIGN.md § Image Treatment). */}
        <figure className="@container mx-auto" style={{ width: `min(100%, calc(${ratio} * ${FRAME_VH}svh))` }}>
          <div className="overflow-hidden rounded-lg bg-stone" style={placeholderStyle(photo.src)}>
            <Image
              src={cloudinary(photo.src, { watermark: true, width: 2000 })}
              alt={label}
              width={0}
              height={0}
              sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
              className="block w-full h-auto"
              // 프레임 높이는 이미지가 정한다: 저장된 비율로 자리를 먼저 잡고
              // (레이아웃 이동 없음), 이미지가 오면 실제 비율이 이긴다. 그래서
              // 흐린 배경판은 늘 사진 뒤에 정확히 가려진다.
              style={{ aspectRatio: `auto ${ratio}` }}
              // 이 페이지의 LCP. 히어로와 같이 `preload`가 맞는 자리다 — 한 장이고,
              // 모든 폭에서 첫 화면에 있다.
              preload
              draggable={false}
            />
          </div>

          <figcaption className="mt-6 md:mt-8">
            <div className="grid gap-6 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:items-end">
              <div className="min-w-0 space-y-3">
                <p className="eyebrow eyebrow-marked text-primary">{album.title}</p>
                <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink">
                  {title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CopyLinkButton path={path} />
                <a href={inquiryHref} className="btn-primary">
                  이 사진으로 프린트 문의
                </a>
              </div>
            </div>

            <div className="rule-accent mt-6" />

            {/* 값이 없는 줄은 그리지 않는다. 라벨은 한국어 본문 글씨 — 모노 대문자
                자간은 한글을 흩어 놓는다(`PhotoFilter`의 결과 수 주석). */}
            {/* 폰에서는 한 줄에 하나, 넓어지면 값의 길이만큼만 차지하며 옆으로 흐른다.
                고정 칸으로 나누면 "40mm · f/2.8 · 1/160s · ISO 250"이 칸 폭에 걸려
                "ISO 250"만 다음 줄로 떨어졌다. */}
            <dl className="mt-6 flex flex-col gap-4 @md:flex-row @md:flex-wrap @md:gap-x-12 @md:gap-y-5 text-[15px]">
              {taken ? (
                <Detail term="촬영일"><span className="tabular-nums">{taken}</span></Detail>
              ) : caption.year ? (
                <Detail term="연도"><span className="tabular-nums">{caption.year}</span></Detail>
              ) : null}
              {location && <Detail term="장소">{location}</Detail>}
              {camera && photo.camera && (
                <Detail term="카메라">
                  {/* 같은 카메라로 찍은 사진을 전부 — `/archive`의 필터가 `?camera=`를 읽는다. */}
                  <Link href={cameraArchiveHref(photo.camera.trim())} className="link-leaf">
                    {camera}
                  </Link>
                </Detail>
              )}
              {settings.length > 0 && (
                <Detail term="설정">
                  <span className="font-mono text-[13px] tracking-normal whitespace-nowrap">{joinCaption(settings)}</span>
                </Detail>
              )}
              <Detail term="컬렉션">
                <Link href={`/archive/${album.slug}`} className="link-leaf">
                  {album.title}
                </Link>
              </Detail>
            </dl>
          </figcaption>
        </figure>

        {/* 이전 / 다음 사진. 앨범 페이지의 이전/다음 컬렉션 카드와 같은 모양이고,
            ←/→ 키도 같은 곳으로 간다(`PhotoKeyNav`). */}
        {prev && next && (
          <nav
            aria-label="이 컬렉션의 다른 사진"
            className="mx-auto mt-16 md:mt-24 pt-8 md:pt-10 border-t border-hairline grid grid-cols-2 gap-4 md:gap-6"
            // 위의 사진·캡션과 같은 폭에 맞춘다. 세로 사진의 좁은 기둥 아래에서는
            // 카드 두 장이 들어갈 최소 폭(42rem)까지만 넓힌다.
            style={{ width: `min(100%, max(42rem, calc(${ratio} * ${FRAME_VH}svh)))` }}
          >
            <NeighbourLink photo={prev} direction="prev" />
            <NeighbourLink photo={next} direction="next" />
          </nav>
        )}
      </div>
    </main>
  );
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label-ko text-muted-foreground">{term}</dt>
      <dd className="mt-1 text-ink-body">{children}</dd>
    </div>
  );
}

function NeighbourLink({ photo, direction }: { photo: Photo; direction: 'prev' | 'next' }) {
  const isNext = direction === 'next';
  return (
    <Link
      href={photoPagePath(photo)}
      className={`group card-hair flex items-center gap-3 md:gap-4 px-3 py-3 md:px-4 min-w-0 ${isNext ? 'flex-row-reverse text-right col-start-2' : ''}`}
    >
      {/* 작은 썸네일도 자르지 않는다: 높이를 고정하고 폭은 비율이 정한다. */}
      <span
        className="block h-14 md:h-16 shrink-0 overflow-hidden rounded-sm bg-stone"
        style={{
          aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : '3 / 2',
          ...placeholderStyle(photo.src),
        }}
      >
        <Image
          src={cloudinary(photo.src, { width: 240 })}
          alt=""
          width={0}
          height={0}
          sizes="120px"
          className="block h-full w-full object-contain"
          draggable={false}
        />
      </span>
      <span className="min-w-0">
        <span className="label-ko text-muted-foreground">{isNext ? '다음 사진 →' : '← 이전 사진'}</span>
        <span className="mt-0.5 block truncate text-sm md:text-base font-medium text-ink group-hover:text-primary transition-colors">
          {photoPageTitle(photo).title}
        </span>
      </span>
    </Link>
  );
}
