import type { Metadata } from 'next';

export const SITE_NAME = 'phorage';

export type CardImage = { url: string; width?: number; height?: number; alt?: string };

// 경로가 `openGraph`를 적으면 파일 규약 이미지가 사라지므로 다시 적는다. `alt`·크기는 각 파일과 맞춘다.
export const SITE_CARD: CardImage = { url: '/opengraph-image', width: 1200, height: 630, alt: 'phorage studio' };
export const PORTFOLIO_CARD: CardImage = {
  url: '/portfolio/opengraph-image',
  width: 1200,
  height: 630,
  alt: '이상민 — 데이터 분석 포트폴리오',
};
export const PORTFOLIO_CARD_EN: CardImage = { ...PORTFOLIO_CARD, alt: 'Sangmin Lee — Portfolio · Data analysis' };

interface ShareCardInput {
  /** 루트의 `%s | phorage` 템플릿은 `openGraph`에 적용되지 않으므로 완성된 문자열을 넘긴다. */
  title: string;
  description: string;
  path: string;
  locale?: 'ko_KR' | 'en_US';
  images?: CardImage[];
  article?: { publishedTime?: string };
}

// Next는 메타데이터를 얕게 병합한다 — `openGraph`를 적을 때는 siteName·locale·이미지까지 전부 다시 적는다.
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

export function sectionTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}
