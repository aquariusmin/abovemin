"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EquitySparkline } from "@/components/quant/EquitySparkline";
import { FleetEquityChart } from "@/components/quant/FleetEquityChart";
import { Bar, Frame, Metric, Pill, Section, cx } from "@/components/quant/Panel";
import {
  books, buildSeriesColors, fmtAmount, fmtPct, fmtRelative, lastCycle,
  parseBotName, parseEquityCurve, staleness, type FleetBot,
} from "@/lib/quant";

const REFRESH_MS = 60_000;

type SortKey = "equity" | "pnl_pct" | "updated_at" | "bot_name";

export function FleetDashboard() {
  const [bots, setBots] = useState<FleetBot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("equity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

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
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Built from EVERY row, not the visible ones, so sorting can never repaint
  // a bot's colour.
  const colors = useMemo(
    () => buildSeriesColors((bots ?? []).map((b) => b.id)),
    [bots],
  );

  const sorted = useMemo(() => {
    if (!bots) return [];
    return [...bots].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "desc" ? bv - av : av - bv;
      }
      return sortDir === "desc"
        ? String(bv ?? "").localeCompare(String(av ?? ""))
        : String(av ?? "").localeCompare(String(bv ?? ""));
    });
  }, [bots, sortKey, sortDir]);

  const totals = useMemo(() => {
    if (!bots) return null;
    const parsed = bots.map((b) => parseBotName(b.bot_name));
    return {
      ...books(bots),
      count: bots.length,
      halted: parsed.filter((p) => p.halted).length,
      // Counted on the BOT's last cycle, not the sync stamp — a dead bot behind
      // a live sync container is precisely what this console exists to catch.
      stale: bots.filter(
        (b) => staleness(lastCycle(parseEquityCurve(b.equity_curve), b.updated_at)) !== "live",
      ).length,
    };
  }, [bots]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  if (error) {
    return <Frame className="p-3 text-[var(--lab-critical)]">FEED ERROR · {error}</Frame>;
  }
  if (!bots) {
    return (
      <Frame className="p-3 text-[var(--lab-ink-3)]">
        <span className="pulse">◼</span> establishing feed…
      </Frame>
    );
  }

  const lead = totals && totals.real.length ? totals.real : totals?.sim ?? [];

  return (
    <Frame>
      {/* Anything needing a human is stated in words before any number. A
          halted bot is invisible otherwise: it keeps running, keeps syncing,
          and just quietly stops trading. */}
      {totals && (totals.halted > 0 || totals.stale > 0) ? (
        <Section
          className={cx(
            "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-3 py-2",
            totals.halted > 0
              ? "border-l-[var(--lab-critical)]"
              : "border-l-[var(--lab-warning)]",
          )}
        >
          {totals.halted > 0 ? (
            <Pill tone="critical" dot>
              {totals.halted} bot{totals.halted > 1 ? "s" : ""} halted
            </Pill>
          ) : null}
          {totals.stale > 0 ? (
            <Pill tone="warning" dot>
              {totals.stale} not cycling
            </Pill>
          ) : null}
          <span className="text-[11px] text-[var(--lab-ink-2)]">
            {totals.halted > 0
              ? "A halted bot holds flat and re-checks each cycle. daily → clears at UTC midnight · kill_switch → remove reports/STOP · terminal → operator only."
              : "The row still syncs, but the bot behind it has not run."}
          </span>
        </Section>
      ) : null}

      <Section className="grid grid-cols-2 lg:grid-cols-4">
        {/* One cell per book. There is deliberately no single fleet figure:
            KRW and USD are not addable, and mock equity is not addable to real
            money — a paper profit must never flatter a real loss. */}
        {lead.map((b) => (
          <Metric
            key={b.currency}
            label={`${totals && totals.real.length ? "real" : "sim"} equity · ${b.currency}`}
            value={fmtAmount(b.equity, b.currency, 0)}
            sub={`${b.count} bot${b.count === 1 ? "" : "s"} · ${fmtPct(b.pnl)}`}
          />
        ))}
        {totals && totals.real.length > 0 && totals.sim.length > 0 ? (
          <Metric
            label="sim (not real money)"
            value={totals.sim.map((b) => fmtAmount(b.equity, b.currency, 0)).join("  ")}
            sub={`${totals.sim.reduce((n, b) => n + b.count, 0)} mock bot(s)`}
          />
        ) : null}
        <Metric
          label="halted"
          value={String(totals?.halted ?? 0)}
          tone={totals && totals.halted > 0 ? "critical" : "neutral"}
          sub={totals?.halted ? "trading stopped" : "all bots trading"}
        />
        <Metric
          label="not cycling"
          value={String(totals?.stale ?? 0)}
          tone={totals && totals.stale > 0 ? "warning" : "neutral"}
          sub={lastFetched ? `feed ${fmtRelative(lastFetched.toISOString())}` : "—"}
        />
      </Section>

      <Section>
        <Bar title="relative performance" right={<span className="lab-label">all bots · one axis</span>} />
        <div className="p-3">
          <FleetEquityChart bots={bots} colors={colors} />
        </div>
      </Section>

      <Section>
        <Bar
          title="fleet"
          right={<span className="lab-label">{sorted.length} row{sorted.length === 1 ? "" : "s"}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="glass-inset border-b border-[var(--lab-border)]">
                <Th onClick={() => toggleSort("bot_name")} active={sortKey === "bot_name"} dir={sortDir}>bot</Th>
                <Th>venue</Th>
                <Th>state</Th>
                <Th align="right" onClick={() => toggleSort("equity")} active={sortKey === "equity"} dir={sortDir}>equity</Th>
                <Th align="right" onClick={() => toggleSort("pnl_pct")} active={sortKey === "pnl_pct"} dir={sortDir}>pnl</Th>
                <Th align="right">pos</Th>
                <Th align="right">hold</Th>
                <Th align="right">fills</Th>
                <Th>trend</Th>
                <Th align="right" onClick={() => toggleSort("updated_at")} active={sortKey === "updated_at"} dir={sortDir}>last cycle</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const bot = parseBotName(b.bot_name);
                const points = parseEquityCurve(b.equity_curve);
                const positive = (b.pnl_pct ?? 0) >= 0;
                const age = staleness(lastCycle(points, b.updated_at));
                return (
                  <tr key={b.id} className="row-hover border-b border-[var(--lab-border)] transition-colors last:border-0">
                    <td className="relative py-1 pl-3.5 pr-2.5">
                      {/* Leading stripe carries series identity, tying the row
                          to its line above. Condition is the STATE pill, in
                          words — two colour marks per row was just noise. */}
                      <span
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: colors.get(b.id) ?? "var(--lab-border-strong)" }}
                        aria-hidden
                      />
                      <Link href={`/lab/bot/${encodeURIComponent(b.id)}`} className="group flex items-center gap-2">
                        <span className="shrink-0 text-[var(--lab-ink-1)] group-hover:text-[var(--lab-accent)]">
                          {bot.tag}
                        </span>
                        {/* A legacy bot name can be a whole parameter dump. */}
                        <span className="min-w-0 truncate text-[10px] text-[var(--lab-ink-3)]" title={bot.strategy}>
                          {bot.strategy}
                        </span>
                      </Link>
                    </td>
                    <td className="px-2.5 py-1">
                      <Pill tone={bot.venue ? (bot.real ? "serious" : "neutral") : "neutral"}>
                        {bot.venue ?? "SIM"}
                      </Pill>
                    </td>
                    <td className="px-2.5 py-1">
                      {bot.halted ? (
                        <Pill tone="critical" dot>halted·{bot.haltKind}</Pill>
                      ) : age === "live" ? (
                        <Pill tone="good" dot>trading</Pill>
                      ) : (
                        <Pill tone="warning" dot>{age}</Pill>
                      )}
                    </td>
                    <Td right mono>{fmtAmount(b.equity, b.currency, 2)}</Td>
                    <Td right mono className={positive ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]"}>
                      {fmtPct(b.pnl_pct)}
                    </Td>
                    <Td right mono muted>{b.position_pct !== null ? `${b.position_pct.toFixed(0)}%` : "—"}</Td>
                    <Td right mono muted>{b.holdings_count ?? "—"}</Td>
                    <Td right mono muted>{b.fills_count ?? "—"}</Td>
                    <td className="px-2.5 py-1">
                      <EquitySparkline points={points} positive={positive} />
                    </td>
                    <Td right mono muted>
                      {fmtRelative(new Date(lastCycle(points, b.updated_at)).toISOString())}
                    </Td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-[var(--lab-ink-3)]">
                    No bots have synced yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </Frame>
  );
}

function Th({
  children, onClick, active, dir, align = "left",
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  align?: "left" | "right";
}) {
  return (
    <th
      className={cx(
        "px-2.5 py-1.5 font-normal",
        align === "right" ? "text-right" : "text-left",
        onClick && "cursor-pointer select-none",
      )}
      onClick={onClick}
    >
      <span className={cx("lab-label", active && "text-[var(--lab-ink-1)]")}>
        {children}
        {active ? (dir === "desc" ? " ↓" : " ↑") : ""}
      </span>
    </th>
  );
}

function Td({
  children, right, mono, muted, className,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "px-2.5 py-1",
        right && "text-right",
        mono && "tnum",
        muted ? "text-[var(--lab-ink-2)]" : "text-[var(--lab-ink-1)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
