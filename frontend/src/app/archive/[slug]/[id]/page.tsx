import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllPhotos, getPhotoInAlbum, type Photo } from '@/lib/supabase';
import { cloudinary, cloudinaryAspect, cloudinaryOgImage, DEFAULT_ASPECT, OG_HEIGHT, OG_WIDTH } from '@/lib/cloudinary';
import { displayCamera, exifParts, joinCaption, photoCaption, photoLabel, takenDate } from '@/lib/caption';
import {
  photoDocumentTitle,
  photoImageUrl,
  photoJsonLd,
  photoPageDescription,
  photoPagePath,
  photoPageTitle,
  printInquiryMailto,
} from '@/lib/photo-share';
import { cameraArchiveHref } from '@/lib/camera';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import BackLink from '@/components/BackLink';
import CopyLinkButton from '@/components/archive/CopyLinkButton';
import PhotoKeyNav from '@/components/archive/PhotoKeyNav';
import { placeholderStyle } from '@/components/photo-placeholder';
import { buildFallback } from '@/lib/build-phase';
import { displayFace } from '@/lib/typography';

// revalidateArchive()가 무효화한다. 300초는 그 신호를 놓쳤을 때의 안전망이다.
export const revalidate = 300;

type Params = Promise<{ slug: string; id: string }>;

// 정규형 id만 받는다 — 한 사진에 URL이 여러 개면 canonical이 흐려진다.
function parsePhotoId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

async function findPhoto(params: Params) {
  const { slug, id } = await params;
  const photoId = parsePhotoId(id);
  if (photoId === null) return null;
  return getPhotoInAlbum(slug, photoId);
}

// 조회 실패는 빈 배열 — 배포 순간 Supabase가 흔들려도 빌드가 죽지 않게(dynamicParams가 받친다).
export async function generateStaticParams() {
  const photos = await getAllPhotos().catch(() => []);
  return photos.map(photo => ({ slug: photo.album_slug, id: String(photo.id) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await findPhoto(params);
  if (!found) return { title: 'Photo Not Found' };
  const { album, photo, photos, index } = found;

  const fullTitle = `${photoDocumentTitle(photos, index)} — ${album.title}`;
  const description = photoPageDescription(photo, album.title);
  const path = photoPagePath(photo);
  const og = cloudinaryOgImage(photo.src);
  const image = og
    ? { url: og, width: OG_WIDTH, height: OG_HEIGHT, alt: photoLabel(photo) }
    : { url: photo.src, alt: photoLabel(photo) };

  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    // openGraph·twitter는 얕은 병합이라 사이트 이름·언어·이미지를 다시 적어야 한다.
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

// 저장된 크기는 비율로만 쓴다 — 원본이 1500px 안팎으로 줄어 있다.
async function frameRatio(photo: Photo): Promise<number> {
  if (photo.width && photo.height) return photo.width / photo.height;
  return (await cloudinaryAspect(photo.src)) ?? DEFAULT_ASPECT;
}

const FRAME_VH = 74;

const SIZES_VIEWPORT_H = 1150;

// 영구 리다이렉트는 새 주소가 지금 주소와 다르고 실제로 열릴 때만 — 비공개 노출·무한 루프 방지.
async function movedPhotoPath(params: Params): Promise<string | null> {
  const { slug, id } = await params;
  const photoId = parsePhotoId(id);
  if (photoId === null) return null;
  const photos = await getAllPhotos().catch(buildFallback([]));
  const moved = photos.find(photo => photo.id === photoId);
  if (!moved || moved.album_slug === slug) return null;
  // 조회 실패는 던진다 — 404가 ISR 캐시에 앉지 않게.
  const target = await getPhotoInAlbum(moved.album_slug, photoId);
  return target ? photoPagePath(moved) : null;
}

export default async function PhotoPage({ params }: { params: Params }) {
  const found = await findPhoto(params);
  if (!found) {
    const path = await movedPhotoPath(params);
    if (path) permanentRedirect(path);
    notFound();
  }
  const { album, photo, index, total, prev, next } = found;

  const ratio = await frameRatio(photo);
  const caption = photoCaption(photo);
  const { title, repeatsLocation } = photoPageTitle(photo);
  const label = photoLabel(photo);
  const path = photoPagePath(photo);
  const taken = takenDate(photo.taken_at);
  const camera = displayCamera(photo.camera);
  const settings = exifParts({
    focal_length: photo.focal_length,
    aperture: photo.aperture,
    shutter: photo.shutter,
    iso: photo.iso,
  });
  const location = repeatsLocation ? null : caption.location;
  const inquiryHref = printInquiryMailto(CONTACT_EMAIL, photo, `${SITE_URL}${path}`);

  // 가장 넓게 그려질 때의 CSS 폭. 프레임 폭이 비율 × 74svh라 높이 기준을 높게 잡는다.
  const maxWidth = Math.min(1400, Math.round(ratio * SIZES_VIEWPORT_H * (FRAME_VH / 100)));
  const prevHref = prev ? photoPagePath(prev) : null;
  const nextHref = next ? photoPagePath(next) : null;
  const jsonLd = photoJsonLd(photo, album, SITE_URL);

  return (
    <main className="px-5 sm:px-6 md:px-10 pt-6 md:pt-10 pb-16 md:pb-24 min-h-screen bg-canvas text-ink-body">
      {/* `<`를 유니코드 이스케이프한다 — 제목에 "</script>"가 있으면 블록이 끝난다. */}
      {jsonLd.map(node => (
        <script
          key={node['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node).replace(/</g, '\\u003c') }}
        />
      ))}
      <PhotoKeyNav prevHref={prevHref} nextHref={nextHref} />

      <div className="max-w-[1400px] mx-auto">
        <div className="mb-5 md:mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <BackLink href={`/archive/${album.slug}`}>{album.title}</BackLink>
          <p className="eyebrow text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </p>
        </div>

        {/* 폭은 사진 비율로 정한다(min(100%, 비율 × 74svh)). 자르지 않는다(DESIGN.md § Image Treatment). */}
        <figure className="@container mx-auto" style={{ width: `min(100%, calc(${ratio} * ${FRAME_VH}svh))` }}>
          <div className="overflow-hidden rounded-lg bg-stone" style={placeholderStyle(photo.src)}>
            <Image
              src={photoImageUrl(photo.src)}
              alt={label}
              width={0}
              height={0}
              sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
              className="block w-full h-auto"
              style={{ aspectRatio: `auto ${ratio}` }}
              preload
              // `preload`만으로는 우선순위가 오르지 않는다.
              fetchPriority="high"
              draggable={false}
            />
          </div>

          <figcaption className="mt-6 md:mt-8">
            <div className="grid gap-6 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:items-end">
              <div className="min-w-0 space-y-3">
                <p className="eyebrow eyebrow-marked text-primary">{album.title}</p>
                <h1 className={`${displayFace(title)} text-3xl md:text-4xl font-medium tracking-tight leading-[1.15] text-ink`}>
                  {title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CopyLinkButton path={path} />
                <a href={inquiryHref} className="btn-primary">
                  이 사진 프린트 문의
                </a>
              </div>
            </div>

            <div className="rule-accent mt-6" />

            <dl className="mt-6 flex flex-col gap-4 @md:flex-row @md:flex-wrap @md:gap-x-12 @md:gap-y-5 text-[15px]">
              {taken ? (
                <Detail term="촬영일"><span className="tabular-nums">{taken}</span></Detail>
              ) : caption.year ? (
                <Detail term="연도"><span className="tabular-nums">{caption.year}</span></Detail>
              ) : null}
              {location && <Detail term="장소">{location}</Detail>}
              {camera && photo.camera && (
                <Detail term="카메라">
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
              <Detail term="앨범">
                <Link href={`/archive/${album.slug}`} className="link-leaf">
                  {album.title}
                </Link>
              </Detail>
            </dl>
          </figcaption>
        </figure>

        {prev && next && (
          <nav
            aria-label="이 앨범의 다른 사진"
            className="mx-auto mt-16 md:mt-24 pt-8 md:pt-10 border-t border-hairline grid grid-cols-2 gap-4 md:gap-6"
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
