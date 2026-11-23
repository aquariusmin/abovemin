import { SITE_URL } from '@/lib/site';
import { getPublishedNotes } from '@/lib/supabase';
import { buildFallback } from '@/lib/build-phase';

const BASE = SITE_URL;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// GET 핸들러는 기본이 동적이라 정적임을 명시한다. revalidateNotes()가 무효화한다.
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  // 실행 중에는 던져 마지막 성공 피드를 유지한다 — 빈 피드가 캐시되면 리더가 글이 사라졌다고 읽는다.
  const notes = await getPublishedNotes().catch(buildFallback([]));
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
