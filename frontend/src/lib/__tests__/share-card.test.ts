import { describe, expect, it } from 'vitest';
import { PORTFOLIO_CARD, SITE_CARD, sectionTitle, shareCard } from '@/lib/share-card';

/**
 * 이 파일이 지키는 것: 경로가 `openGraph`를 적는 순간 루트 것이 통째로 사라지므로
 * (얕은 병합), 카드에 필요한 칸이 하나도 빠지지 않고 다시 적힌다.
 */

describe('shareCard', () => {
  it('사이트 이름·언어·종류·주소를 다시 적고, twitter도 같은 제목과 설명을 갖는다', () => {
    expect(shareCard({ title: sectionTitle('Shop'), description: 'd', path: '/shop' })).toEqual({
      openGraph: {
        title: 'Shop | phorage',
        description: 'd',
        url: '/shop',
        siteName: 'phorage',
        locale: 'ko_KR',
        type: 'website',
        images: [SITE_CARD],
      },
      twitter: { card: 'summary_large_image', title: 'Shop | phorage', description: 'd', images: [SITE_CARD] },
    });
  });

  it('영어 페이지는 en_US', () => {
    const card = shareCard({ title: 't', description: 'd', path: '/en/portfolio', locale: 'en_US' });
    expect(card.openGraph).toMatchObject({ locale: 'en_US' });
  });

  it('이미지는 양쪽에 같이 실린다. 적지 않으면 사이트 카드 — 이미지 없는 카드는 없다', () => {
    const images = [{ url: 'https://example.com/a.jpg', width: 1200, height: 630, alt: 'a' }];
    const card = shareCard({ title: 't', description: 'd', path: '/shop/1', images });
    expect(card.openGraph).toMatchObject({ images });
    expect(card.twitter).toMatchObject({ images });
    const bare = shareCard({ title: 't', description: 'd', path: '/shop/1' });
    expect(bare.openGraph).toMatchObject({ images: [SITE_CARD] });
    expect(bare.twitter).toMatchObject({ images: [SITE_CARD] });
  });

  it('카드 주소는 origin 없는 경로 — `metadataBase`(SITE_URL)가 붙인다', () => {
    expect(SITE_CARD.url).toBe('/opengraph-image');
    expect(PORTFOLIO_CARD.url).toBe('/portfolio/opengraph-image');
  });

  it('글은 article과 발행일', () => {
    const card = shareCard({ title: 't', description: 'd', path: '/notes/a', article: { publishedTime: '2026-01-02' } });
    expect(card.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-01-02' });
  });
});
