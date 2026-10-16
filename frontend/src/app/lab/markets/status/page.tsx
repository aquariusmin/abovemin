import { Missing, Shell } from '@/components/markets/Shell';
import { JobsTable } from '@/components/markets/Tables';
import { loadCore, requireOwner } from '@/lib/markets/store';

export default async function MarketsStatus() {
  await requireOwner();
  const { data: core, error, readAt: now } = await loadCore();
  return (
    <Shell active="status" generatedAt={core?.generated_at} now={now} notice={core?.notice}>
      {core?.status ? <JobsTable status={core.status} /> : <Missing title="상태 없음" reason={error ?? '업로드 없음'} />}
    </Shell>
  );
}
