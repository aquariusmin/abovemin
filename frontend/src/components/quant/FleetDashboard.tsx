"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EquitySparkline } from "@/components/quant/EquitySparkline";
import {
  fleetTotalPnl,
  fmtMoney,
  fmtPct,
  fmtRelative,
  parseEquityCurve,
  type FleetBot,
  type Market,
} from "@/lib/quant";

const REFRESH_MS = 60_000;

type SortKey = "equity" | "pnl_pct" | "updated_at" | "bot_name";

// Centralised reused class strings — keeps the JSX legible and the
// dark/mono palette consistent with the rest of /lab.
const SECTION_LABEL =
  "text-[9px] font-mono uppercase tracking-[0.3em] text-white/30";
const STAT_BLOCK =
  "border border-white/8 bg-white/3 p-5 space-y-2";
const STAT_LABEL =
  "text-[9px] font-mono uppercase tracking-widest text-white/30";

export function FleetDashboard() {
  const [bots, setBots] = useState<FleetBot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<Market | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("equity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      try {
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
    fetchRows();
    const id = setInterval(fetchRows, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!bots) return [];
    const f =
      marketFilter === "all"
        ? bots
        : bots.filter((b) => b.market === marketFilter);
    const sorted = [...f].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "desc" ? bv - av : av - bv;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "desc" ? bs.localeCompare(as) : as.localeCompare(bs);
    });
    return sorted;
  }, [bots, marketFilter, sortKey, sortDir]);

  const totals = useMemo(() => (bots ? fleetTotalPnl(bots) : null), [bots]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  if (error) {
    return (
      <div className="border border-red-400/20 bg-red-400/5 p-6">
        <p className={SECTION_LABEL}>── Error</p>
        <p className="mt-2 font-mono text-[11px] text-red-400">
          Failed to load fleet: {error}
        </p>
      </div>
    );
  }

  if (!bots) {
    return (
      <div className="border border-white/8 bg-white/2 p-12 text-center">
        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest animate-pulse">
          Loading fleet data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Paper Equity" value={totals ? fmtMoney(totals.equity) : "—"} />
        <Stat
          label="Paper PnL"
          value={totals ? fmtPct(totals.pnl) : "—"}
          tone={totals ? (totals.pnl >= 0 ? "pos" : "neg") : undefined}
        />
        <Stat label="Active Bots" value={String(totals ? bots.length : 0)} />
        <Stat
          label="Last Refresh"
          value={lastFetched ? fmtRelative(lastFetched.toISOString()) : "—"}
        />
      </section>

      {/* Filter + sort row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(["all", "crypto", "stock"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all ${
                marketFilter === m
                  ? "bg-accent text-white"
                  : "border border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/25">
          auto-refresh · {REFRESH_MS / 1000}s
        </span>
      </div>

      {/* Fleet table */}
      <section className="space-y-4">
        <h3 className={SECTION_LABEL}>── Fleet · {filtered.length} bot(s)</h3>
        <div className="border border-white/8 bg-white/2 overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-white/30 border-b border-white/8">
                <Th onClick={() => toggleSort("bot_name")} active={sortKey === "bot_name"} dir={sortDir}>
                  Bot
                </Th>
                <Th>Mkt</Th>
                <Th onClick={() => toggleSort("equity")} active={sortKey === "equity"} dir={sortDir} align="right">
                  Equity
                </Th>
                <Th onClick={() => toggleSort("pnl_pct")} active={sortKey === "pnl_pct"} dir={sortDir} align="right">
                  PnL
                </Th>
                <Th align="right">Pos</Th>
                <Th align="right">Syms</Th>
                <Th align="right">Fil</Th>
                <Th>Last Fill</Th>
                <Th>Trend</Th>
                <Th onClick={() => toggleSort("updated_at")} active={sortKey === "updated_at"} dir={sortDir} align="right">
                  Updated
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((b) => {
                const points = parseEquityCurve(b.equity_curve);
                const up = (b.pnl_pct ?? 0) >= 0;
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-white/4 transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/lab/bot/${encodeURIComponent(b.id)}`}
                        className="text-white/80 hover:text-accent-light transition-colors"
                      >
                        {b.bot_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 ${
                          b.market === "crypto"
                            ? "text-amber-300 bg-amber-300/10"
                            : "text-sky-300 bg-sky-300/10"
                        }`}
                      >
                        {b.market}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/80">
                      {fmtMoney(b.equity)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`px-1.5 py-0.5 font-bold ${
                          up
                            ? "text-emerald-400 bg-emerald-400/10"
                            : "text-red-400 bg-red-400/10"
                        }`}
                      >
                        {fmtPct(b.pnl_pct)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/40">
                      {b.position_pct === null
                        ? "—"
                        : `${Math.round(b.position_pct)}%`}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/40">
                      {b.holdings_count ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/40">
                      {b.fills_count ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-white/40 text-[10px] truncate max-w-[180px]">
                      {b.last_fill ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <EquitySparkline points={points} positive={up} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/30 text-[10px] whitespace-nowrap">
                      {fmtRelative(b.updated_at)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-[10px] font-mono text-white/30 uppercase tracking-widest"
                  >
                    No bots match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const valueColor =
    tone === "pos"
      ? "text-emerald-400"
      : tone === "neg"
        ? "text-red-400"
        : "text-white";
  return (
    <div className={STAT_BLOCK}>
      <p className={STAT_LABEL}>{label}</p>
      <p className={`text-2xl font-black tracking-tight font-mono ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  align,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  align?: "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 font-bold ${
        align === "right" ? "text-right" : "text-left"
      } ${onClick ? "cursor-pointer select-none hover:text-white/60" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && <span aria-hidden>{dir === "desc" ? "↓" : "↑"}</span>}
      </span>
    </th>
  );
}
