import { Missing, Shell } from '@/components/markets/Shell';
import { DisclosuresTable, NewsTable } from '@/components/markets/Tables';
import { loadNews, requireOwner } from '@/lib/markets/store';

export default async function MarketsNews() {
  await requireOwner();
  const { data: news, error, readAt: now } = await loadNews();
  return (
    <Shell active="news" generatedAt={news?.generated_at} now={now}>
      {news ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <NewsTable news={news} />
          <DisclosuresTable news={news} />
        </div>
      ) : (
        <Missing title="뉴스 없음" reason={error ?? '업로드 없음'} />
      )}
    </Shell>
  );
}
