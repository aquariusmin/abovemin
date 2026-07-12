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

const SECTION_LABEL = "eyebrow text-white/40";
const CARD = "rounded-md border border-white/8 bg-white/[0.02]";
const STAT_LABEL =
  "text-[10px] font-mono uppercase tracking-[0.2em] text-white/40";

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
      <div className="rounded-md border border-red-400/25 bg-red-400/[0.06] p-6">
        <p className="eyebrow text-red-300/70">Error</p>
        <p className="mt-2 font-mono text-[12px] text-red-400">{error}</p>
      </div>
    );
  }

  if (!bots) {
    return (
      <div className={`${CARD} p-12 text-center`}>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/25 animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className={`${CARD} p-12 space-y-4`}>
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">
          No bot with id <span className="text-white/75">{botId}</span>
        </p>
        <Link
          href="/lab"
          className="text-[11px] font-mono uppercase tracking-[0.18em] text-accent-light hover:text-white transition-colors"
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
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/lab"
          className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 hover:text-accent-light transition-colors"
        >
          ← fleet
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl md:text-5xl font-medium text-white tracking-tight leading-[1.05]">
            {bot.bot_name}
          </h1>
          <span
            className={`rounded text-[10px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 ${
              bot.market === "crypto"
                ? "text-amber-300 bg-amber-300/10"
                : "text-sky-300 bg-sky-300/10"
            }`}
          >
            {bot.market}
          </span>
          <span className="rounded text-[10px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 text-white/50 bg-white/5">
            {bot.strategy}
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/35">
          updated {fmtRelative(bot.updated_at)} ·{" "}
          <span className="text-white/55">{bot.id}</span>
        </p>
        <p className="inline-flex rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-200">
          Paper trading only · simulated capital · no real-money performance
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Paper Equity" value={fmtMoney(bot.equity)} />
        <Stat
          label="Paper PnL"
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

      <section className={`${CARD} p-4 md:p-6 space-y-4`}>
        <h3 className={SECTION_LABEL}>
          Equity Curve · last {points.length} points
        </h3>
        <EquityChart points={points} positive={up} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${CARD} p-5 space-y-4`}>
          <h3 className={SECTION_LABEL}>
            Holdings · {bot.holdings ? Object.keys(bot.holdings).length : 0} symbol(s)
          </h3>
          <HoldingsTable holdings={bot.holdings} equity={bot.equity} />
        </div>
        <div className={`${CARD} p-5 space-y-3`}>
          <h3 className={SECTION_LABEL}>Recent Activity</h3>
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
    <div className={`${CARD} p-5 space-y-2`}>
      <p className={STAT_LABEL}>{label}</p>
      <p className={`text-2xl font-bold tracking-tight font-mono ${color}`}>
        {value}
      </p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px] font-mono">
      <span className="text-white/40 uppercase tracking-[0.18em] text-[10px]">
        {k}
      </span>
      <span className="text-white/80 text-right break-all">{v}</span>
    </div>
  );
}
