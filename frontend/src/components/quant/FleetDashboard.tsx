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
  /** Server-rendered first paint. See `getFleet` in `app/lab/page.tsx`. */
  initialBots = null,
  /** When the server read `initialBots` (epoch ms). Staleness is judged
   *  against this until the first client fetch, so the server HTML and the
   *  hydrating render pick the same state pill. */
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

  // Only a feed that never delivered anything is a full-screen error. Once
  // there are numbers on screen, a failed poll keeps them and says so.
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

  // Built from EVERY row, not the visible ones, so sorting can never repaint
  // a bot's colour.
  const colors = buildSeriesColors(bots.map((b) => b.id), LAB_SERIES);
  const sorted = sortBots(bots, sortKey, sortDir);
  const { real, sim } = books(bots);
  const halted = bots.filter((b) => parseBotName(b.bot_name).halted).length;
  // Counted on the BOT's last cycle, not the sync stamp — a dead bot behind a
  // live sync container is precisely what this console exists to catch.
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

/**
 * Polls the fleet route, seeded with the server's rows.
 *
 * Seeded so the console has numbers in the HTML itself; it still refreshes on
 * mount, so what you read is never older than the page's own ISR window.
 */
function useFleetFeed(initialBots: FleetBot[] | null, renderedAt: number) {
  const [bots, setBots] = useState<FleetBot[] | null>(initialBots);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  // The clock staleness is judged by. Not `Date.now()` in render: an ISR page
  // can be served minutes or days after it was rendered, and a bot crossing
  // the 30h line in between would hydrate with a different pill — words and
  // colour — than the HTML it is meant to adopt. It advances on every poll.
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Server route, not the browser Supabase client: it keeps the key on
        // the server and adds an edge cache in front of the table.
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

    // Don't poll a tab nobody is looking at. The console refreshes forever
    // once opened, and a backgrounded tab was still spending a request a
    // minute — on the client's battery and on the edge cache alike. Coming
    // back to the tab refetches immediately, so what you see on return is
    // current rather than however stale the last background tick left it.
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

/**
 * Anything needing a human is stated in words before any number. A halted bot
 * is invisible otherwise: it keeps running, keeps syncing, and just quietly
 * stops trading.
 */
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

/**
 * One cell per book. There is deliberately no single fleet figure: KRW and USD
 * are not addable, and mock equity is not addable to real money — a paper
 * profit must never flatter a real loss.
 */
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
