"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EquityChart } from "@/components/quant/EquityChart";
import { HoldingsTable } from "@/components/quant/HoldingsTable";
import {
  fmtMoney,
  fmtPct,
  fmtRelative,
  parseEquityCurve,
  type FleetBot,
} from "@/lib/quant";

const REFRESH_MS = 60_000;

const SECTION_LABEL =
  "text-[9px] font-mono uppercase tracking-[0.3em] text-white/30";
const STAT_BLOCK = "border border-white/8 bg-white/3 p-5 space-y-2";
const STAT_LABEL =
  "text-[9px] font-mono uppercase tracking-widest text-white/30";

// The list endpoint is the single source of truth; pulling the whole
// fleet and filtering client-side keeps us off a second route and means
// the detail view stays in sync with the list whenever it refreshes.
export function BotDetail({ botId }: { botId: string }) {
  const [bots, setBots] = useState<FleetBot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const bot = useMemo(
    () => bots?.find((b) => b.id === botId) ?? null,
    [bots, botId],
  );
  const points = useMemo(
    () => (bot ? parseEquityCurve(bot.equity_curve) : []),
    [bot],
  );

  if (error) {
    return (
      <div className="border border-red-400/20 bg-red-400/5 p-6">
        <p className={SECTION_LABEL}>── Error</p>
        <p className="mt-2 font-mono text-[11px] text-red-400">{error}</p>
      </div>
    );
  }

  if (!bots) {
    return (
      <div className="border border-white/8 bg-white/2 p-12 text-center">
        <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="border border-white/8 bg-white/2 p-12 space-y-4">
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
          No bot with id <span className="text-white/70">{botId}</span>
        </p>
        <Link
          href="/lab"
          className="text-[10px] font-mono uppercase tracking-widest text-accent-light hover:text-white transition-colors"
        >
          ← back to fleet
        </Link>
      </div>
    );
  }

  const up = (bot.pnl_pct ?? 0) >= 0;
  const positionValue =
    bot.cash !== null && bot.cash !== undefined
      ? Math.max(0, bot.equity - bot.cash)
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/lab"
          className="inline-block text-[9px] font-mono uppercase tracking-widest text-white/40 hover:text-accent-light transition-colors"
        >
          ← fleet
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {bot.bot_name}
          </h1>
          <span
            className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 ${
              bot.market === "crypto"
                ? "text-amber-300 bg-amber-300/10"
                : "text-sky-300 bg-sky-300/10"
            }`}
          >
            {bot.market}
          </span>
          <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 text-white/40 bg-white/5">
            {bot.strategy}
          </span>
        </div>
        <p className="text-[10px] font-mono text-white/30">
          updated {fmtRelative(bot.updated_at)} ·{" "}
          <span className="text-white/50">{bot.id}</span>
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Equity" value={fmtMoney(bot.equity)} />
        <Stat
          label="PnL"
          value={fmtPct(bot.pnl_pct)}
          tone={up ? "pos" : "neg"}
        />
        <Stat label="Cash" value={bot.cash !== null ? fmtMoney(bot.cash) : "—"} />
        <Stat
          label="Position"
          value={
            bot.position_pct === null
              ? "—"
              : `${Math.round(bot.position_pct)}%${
                  positionValue !== null ? ` · ${fmtMoney(positionValue)}` : ""
                }`
          }
        />
      </section>

      <section className="border border-white/8 bg-white/2 p-4 md:p-6 space-y-3 md:space-y-4">
        <h3 className={SECTION_LABEL}>
          ── Equity Curve · last {points.length} points
        </h3>
        <EquityChart points={points} positive={up} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-white/8 bg-white/2 p-5 space-y-4">
          <h3 className={SECTION_LABEL}>
            ── Holdings · {bot.holdings ? Object.keys(bot.holdings).length : 0} symbol(s)
          </h3>
          <HoldingsTable holdings={bot.holdings} equity={bot.equity} />
        </div>
        <div className="border border-white/8 bg-white/2 p-5 space-y-3">
          <h3 className={SECTION_LABEL}>── Recent Activity</h3>
          <KV
            k="Total Fills"
            v={bot.fills_count !== null ? String(bot.fills_count) : "—"}
          />
          <KV k="Last Fill" v={bot.last_fill ?? "—"} />
          <KV k="Updated" v={new Date(bot.updated_at).toLocaleString()} />
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
  const color =
    tone === "pos"
      ? "text-emerald-400"
      : tone === "neg"
        ? "text-red-400"
        : "text-white";
  return (
    <div className={STAT_BLOCK}>
      <p className={STAT_LABEL}>{label}</p>
      <p className={`text-2xl font-black tracking-tight font-mono ${color}`}>
        {value}
      </p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px] font-mono">
      <span className="text-white/30 uppercase tracking-widest text-[9px]">
        {k}
      </span>
      <span className="text-white/80 text-right break-all">{v}</span>
    </div>
  );
}
