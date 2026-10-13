import type { Metadata } from 'next';

/** 공유 카드의 `og:site_name`. 루트 레이아웃이 적는 값과 같다. */
export const SITE_NAME = 'phorage';

export type CardImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * 파일 규약으로 만드는 두 장의 카드(`app/opengraph-image.tsx`,
 * `app/portfolio/opengraph-image.tsx`)를 가리키는 주소.
 *
 * 파일 규약의 이미지는 **그 파일이 있는 세그먼트의 `openGraph`에만** 들어간다.
 * 아래 경로가 `openGraph`를 직접 적으면 부모 것이 통째로 갈리면서 이미지도 같이
 * 사라진다 — `/archive`가 그렇게 `og:image` 없이 나가고 있었다(빌드해서 확인).
 * 그래서 적을 때는 이미지도 다시 적는다. `alt`와 크기는 그 파일의 `alt`·`size`와
 * 같은 값이다 — 한쪽을 바꾸면 같이 고친다. 영어 포트폴리오의 `alt`는 카드에
 * 실제로 찍힌 글자다(카드에는 한글이 없다).
 */
export const SITE_CARD: CardImage = { url: '/opengraph-image', width: 1200, height: 630, alt: 'phorage studio' };
export const PORTFOLIO_CARD: CardImage = {
  url: '/portfolio/opengraph-image',
  width: 1200,
  height: 630,
  alt: '이상민 — 데이터 분석 포트폴리오',
};
export const PORTFOLIO_CARD_EN: CardImage = { ...PORTFOLIO_CARD, alt: 'Sangmin Lee — Portfolio · Data analysis' };

interface ShareCardInput {
  /** 카드에 찍힐 제목. 루트의 `%s | phorage` 템플릿은 `openGraph`에 적용되지 않으므로 완성된 문자열을 넘긴다. */
  title: string;
  description: string;
  /** canonical과 같은 경로(`/shop`). `metadataBase`가 절대 주소로 만든다. */
  path: string;
  /** 영어 포트폴리오만 `en_US`. */
  locale?: 'ko_KR' | 'en_US';
  /** 그 경로만의 이미지(사진·커버·상품). 적지 않으면 사이트 카드(`SITE_CARD`). */
  images?: CardImage[];
  /** 글(노트)이면 `og:type`이 `article`이 되고 발행일이 실린다. */
  article?: { publishedTime?: string };
}

/**
 * 한 경로의 `openGraph`·`twitter`.
 *
 * Next는 메타데이터를 **얕게** 병합한다 — 경로가 `openGraph`를 적지 않으면 루트
 * 것이 통째로 내려와, `/shop`이나 `/portfolio`를 공유해도 카드에는 사이트 기본
 * 제목과 설명("Collecting the Greenery")이 찍힌다. 반대로 일부만 적으면 루트의
 * `siteName`·`locale`과 이미지가 사라진다. 그래서 적을 때는 전부 다시 적어야
 * 하고, 그 반복을 여기 모은다.
 *
 * 제목과 설명은 그 경로가 이미 가진 것을 그대로 받는다. 카드용 문구를 따로
 * 만들지 않는다 — 탭 제목과 카드 제목이 다른 말을 하면 어느 쪽이 맞는지 알 수 없다.
 */
export function shareCard({
  title,
  description,
  path,
  locale = 'ko_KR',
  images = [SITE_CARD],
  article,
}: ShareCardInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const shared = { title, description, images };
  return {
    openGraph: {
      ...shared,
      url: path,
      siteName: SITE_NAME,
      locale,
      ...(article
        ? { type: 'article' as const, ...(article.publishedTime ? { publishedTime: article.publishedTime } : {}) }
        : { type: 'website' as const }),
    },
    twitter: { card: 'summary_large_image', ...shared },
  };
}

/** 섹션 첫 화면의 카드 제목: 탭에 뜨는 `<title>`과 같은 "Shop | phorage". */
export function sectionTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}
