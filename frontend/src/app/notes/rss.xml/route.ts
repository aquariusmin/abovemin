import { SITE_URL } from '@/lib/site';
import { getPublishedNotes } from '@/lib/supabase';

const BASE = SITE_URL;

/**
 * Notes의 RSS.
 *
 * 사이트에서 유일하게 **이어지는** 것이라 피드가 의미를 갖는다. 아카이브와
 * 포트폴리오는 찾아와서 보는 것이고, 글은 쌓이는 것이다.
 *
 * 라이브러리를 쓰지 않은 이유: 글 다섯 편에 의존성 하나를 더하는 것보다
 * 20줄을 적는 편이 낫다. XML은 이스케이프만 정확하면 된다.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 정적으로 굽고, 글을 저장할 때 `revalidateNotes()`가 무효화한다. GET 핸들러는
// 기본이 동적이라(요청마다 DB 왕복) 명시한다.
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const notes = await getPublishedNotes().catch(() => []);
  const updated = notes[0]?.date;

  const items = notes
    .map(note => {
      const url = `${BASE}/notes/${note.slug}`;
      return `    <item>
      <title>${escapeXml(note.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${note.date}T09:00:00+09:00`).toUTCString()}</pubDate>
      <description>${escapeXml(note.summary)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>phorage — Notes</title>
    <link>${BASE}/notes</link>
    <description>공개 데이터를 짧게 들여다보고, 말할 수 있는 범위를 함께 적습니다.</description>
    <language>ko</language>
    <atom:link href="${BASE}/notes/rss.xml" rel="self" type="application/rss+xml"/>${
      updated ? `\n    <lastBuildDate>${new Date(`${updated}T09:00:00+09:00`).toUTCString()}</lastBuildDate>` : ''
    }
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
