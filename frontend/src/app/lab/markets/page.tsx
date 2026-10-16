import { BriefingPanel, ForecastPanel, MacroPanel, MarketDetail, MarketStrip } from '@/components/markets/Overview';
import { Missing, Shell } from '@/components/markets/Shell';
import { loadCore, requireOwner } from '@/lib/markets/store';
import { marketParam } from '@/lib/markets/view';

/**
 * Overview of one market (`?m=sp|nq|ks|kq`, default KOSPI). Rendered per
 * request: the admin cookie check makes it dynamic, and only the selected
 * market's series goes to the client chart — the full upload is ~1.3 MB.
 */
export default async function MarketsOverview({ searchParams }: { searchParams: Promise<{ m?: string | string[] }> }) {
  await requireOwner();
  const active = marketParam((await searchParams).m);
  const { data: core, error, readAt: now } = await loadCore();
  if (!core) {
    return (
      <Shell active="overview" now={now}>
        <Missing title="데이터 없음" reason={`${error ?? '업로드 없음'} · PC에서 mi_cli.py publish가 실행되면 채워집니다.`} />
      </Shell>
    );
  }
  const market = core.markets[active];
  return (
    <Shell active="overview" generatedAt={core.generated_at} now={now} notice={core.notice}>
      <MarketStrip markets={core.markets} active={active} />
      {market?.status === 'ok' ? (
        <MarketDetail market={market} />
      ) : (
        <Missing title={market?.name ?? active} reason={market?.reason ?? '이 시장의 데이터가 없습니다.'} />
      )}
      <ForecastPanel core={core} market={active} />
      <BriefingPanel briefing={core.briefing} />
      <MacroPanel core={core} />
    </Shell>
  );
}
