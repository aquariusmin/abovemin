import { Missing, Shell } from '@/components/markets/Shell';
import { ModelDetail, ModelsMatrix } from '@/components/markets/Tables';
import { loadPerformance, requireOwner } from '@/lib/markets/store';
import { marketParam } from '@/lib/markets/view';

export default async function MarketsModels({ searchParams }: { searchParams: Promise<{ m?: string | string[] }> }) {
  await requireOwner();
  const active = marketParam((await searchParams).m);
  const { data: perf, error, readAt: now } = await loadPerformance();
  return (
    <Shell active="models" generatedAt={perf?.generated_at} now={now}>
      {perf ? (
        <>
          <ModelsMatrix perf={perf} active={active} />
          <ModelDetail perf={perf} market={active} />
        </>
      ) : (
        <Missing title="검증 결과 없음" reason={error ?? '업로드 없음'} />
      )}
    </Shell>
  );
}
