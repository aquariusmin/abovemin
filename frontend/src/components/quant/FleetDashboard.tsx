"use client";

import { useEffect, useState } from "react";

import { FleetEquityChart } from "@/components/quant/FleetEquityChart";
import { FleetTable } from "@/components/quant/FleetTable";
import { Bar, FeedStale, Frame, Metric, Pill, Section, cx } from "@/components/quant/Panel";
import { LAB_SERIES } from "@/components/quant/theme";
import {
  books, buildSeriesColors, fmtAmount, fmtPct, fmtRelative, lastCycle,
  parseBotName, parseEquityCurve, sortBots, staleness,
  type Book, type FleetBot, type FleetSortKey, type SortDir,
} from "@/lib/quant";

const REFRESH_MS = 60_000;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function FleetDashboard({
  initialBots = null,
  /** Staleness is judged against this until the first client fetch, so server HTML and hydration agree. */
  renderedAt,
}: {
  initialBots?: FleetBot[] | null;
  renderedAt: number;
}) {
  const { bots, error, lastFetched, now } = useFleetFeed(initialBots, renderedAt);
  const [sortKey, setSortKey] = useState<FleetSortKey>("equity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (k: FleetSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  if (error && !bots) {
    return <Frame className="lab-prose p-4 text-[var(--lab-critical)]">FEED ERROR · {error}</Frame>;
  }
  if (!bots) {
    return (
      <Frame className="lab-prose p-4 text-[var(--lab-ink-3)]">
        <span aria-hidden className="pulse mr-1 inline-block h-2 w-2 bg-current align-middle" /> establishing feed…
      </Frame>
    );
  }

  // Built from every row, not the visible ones, so sorting never repaints a bot's colour.
  const colors = buildSeriesColors(bots.map((b) => b.id), LAB_SERIES);
  const sorted = sortBots(bots, sortKey, sortDir);
  const { real, sim } = books(bots);
  const halted = bots.filter((b) => parseBotName(b.bot_name).halted).length;
  // Counted on the bot's last cycle, not the sync stamp — a dead bot behind a live sync is the point.
  const stale = bots.filter(
    (b) => staleness(lastCycle(parseEquityCurve(b.equity_curve), b.updated_at), now) !== "live",
  ).length;
  const feedAge = lastFetched ? fmtRelative(lastFetched.toISOString()) : null;

  return (
    <Frame>
      {error ? <FeedStale error={error} since={feedAge} /> : null}

      <AttentionBanner halted={halted} stale={stale} />

      <Section className="lab-stats grid grid-cols-2 lg:grid-cols-4">
        <BookMetrics real={real} sim={sim} />
        <Metric
          label="halted"
          value={String(halted)}
          tone={halted > 0 ? "critical" : "neutral"}
          sub={halted ? "trading stopped" : "all bots trading"}
        />
        <Metric
          label="not cycling"
          value={String(stale)}
          tone={stale > 0 ? "warning" : "neutral"}
          sub={feedAge ? `feed ${feedAge}` : "—"}
        />
      </Section>

      <Section>
        <Bar title="relative performance" right={<span className="lab-label">all bots · one axis</span>} />
        <div className="p-4">
          <FleetEquityChart bots={bots} colors={colors} />
        </div>
      </Section>

      <Section>
        <Bar title="fleet" right={<span className="lab-label">{plural(sorted.length, "row")}</span>} />
        <FleetTable
          bots={sorted}
          colors={colors}
          now={now}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      </Section>
    </Frame>
  );
}

function useFleetFeed(initialBots: FleetBot[] | null, renderedAt: number) {
  const [bots, setBots] = useState<FleetBot[] | null>(initialBots);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  // Not `Date.now()` in render: an ISR page hydrating later would pick a different pill than its HTML.
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Server route, not the browser Supabase client: keeps the key server-side behind an edge cache.
        const res = await fetch("/api/market/quant-fleet");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FleetBot[] = await res.json();
        if (cancelled) return;
        setBots(data ?? []);
        setError(null);
        setLastFetched(new Date());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setNow(Date.now());
      }
    };
    load();

    const loadIfVisible = () => {
      if (!document.hidden) load();
    };
    const id = setInterval(loadIfVisible, REFRESH_MS);
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, []);

  return { bots, error, lastFetched, now };
}

function AttentionBanner({ halted, stale }: { halted: number; stale: number }) {
  if (halted === 0 && stale === 0) return null;
  return (
    <Section
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-4 py-3",
        halted > 0
          ? "border-l-[var(--lab-critical)] bg-[color-mix(in_srgb,var(--lab-critical)_5%,transparent)]"
          : "border-l-[var(--lab-warning)] bg-[color-mix(in_srgb,var(--lab-warning)_6%,transparent)]",
      )}
    >
      {halted > 0 ? (
        <Pill tone="critical" dot>
          {halted} bot{halted > 1 ? "s" : ""} halted
        </Pill>
      ) : null}
      {stale > 0 ? (
        <Pill tone="warning" dot>
          {stale} not cycling
        </Pill>
      ) : null}
      <span className="lab-prose text-[var(--lab-ink-2)]">
        {halted > 0
          ? "A halted bot holds flat and re-checks each cycle. daily → clears at UTC midnight · kill_switch → remove reports/STOP · terminal → operator only."
          : "The row still syncs, but the bot behind it has not run."}
      </span>
    </Section>
  );
}

/** No single fleet figure: KRW and USD, or mock and real equity, are not addable. */
function BookMetrics({ real, sim }: { real: Book[]; sim: Book[] }) {
  const hasReal = real.length > 0;
  const lead = hasReal ? real : sim;
  return (
    <>
      {lead.map((b) => (
        <Metric
          key={b.currency}
          label={`${hasReal ? "real" : "sim"} equity · ${b.currency}`}
          value={fmtAmount(b.equity, b.currency, 0)}
          sub={`${plural(b.count, "bot")} · ${fmtPct(b.pnl)}`}
        />
      ))}
      {hasReal && sim.length > 0 ? (
        <Metric
          label="sim (not real money)"
          value={sim.map((b) => fmtAmount(b.equity, b.currency, 0)).join("  ")}
          sub={`${sim.reduce((n, b) => n + b.count, 0)} mock bot(s)`}
        />
      ) : null}
    </>
  );
}
