"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EquityChart } from "@/components/quant/EquityChart";
import { HoldingsTable } from "@/components/quant/HoldingsTable";
import { Bar, Frame, Metric, Pill, Section } from "@/components/quant/Panel";
import {
  fmtAmount, fmtPct, fmtRelative, lastCycle, parseBotName,
  parseEquityCurve, staleness, type FleetBot,
} from "@/lib/quant";

const REFRESH_MS = 60_000;

export function BotDetail({ botId }: { botId: string }) {
  const [bot, setBot] = useState<FleetBot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // ?id= scopes the response so the detail view doesn't download every
        // bot's full equity_curve to render one.
        const res = await fetch(`/api/market/quant-fleet?id=${encodeURIComponent(botId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FleetBot[] = await res.json();
        if (cancelled) return;
        setBot(data?.[0] ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [botId]);

  const points = useMemo(
    () => (bot ? parseEquityCurve(bot.equity_curve) : []),
    [bot],
  );

  if (!loaded) {
    return (
      <Frame className="p-3 text-[var(--lab-ink-3)]">
        <span className="pulse">◼</span> loading…
      </Frame>
    );
  }
  if (error) {
    return <Frame className="p-3 text-[var(--lab-critical)]">FEED ERROR · {error}</Frame>;
  }
  if (!bot) {
    return (
      <Frame className="space-y-2 p-3">
        <div className="text-[var(--lab-ink-2)]">
          no bot with id <span className="text-[var(--lab-ink-1)]">{botId}</span>
        </div>
        <BackLink />
      </Frame>
    );
  }

  const name = parseBotName(bot.bot_name);
  const positive = (bot.pnl_pct ?? 0) >= 0;
  const seen = lastCycle(points, bot.updated_at);
  const age = staleness(seen);
  const positionValue =
    bot.cash !== null && bot.cash !== undefined
      ? Math.max(0, bot.equity - bot.cash)
      : null;

  return (
    <div className="space-y-2">
      <BackLink />
      <Frame>
        {/* Identity first: the venue tag and halt state decide how to read
            every number below, and mock equity looks identical to real money
            otherwise. */}
        <Section className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <h1 className="text-[16px] tracking-[0.12em] text-[var(--lab-ink-1)]">{name.tag}</h1>
          <span className="text-[12px] text-[var(--lab-ink-3)]">{name.strategy}</span>
          <Pill tone={name.venue ? (name.real ? "serious" : "neutral") : "neutral"}>
            {name.venue ?? "SIM"}
          </Pill>
          {name.halted ? (
            <Pill tone="critical" dot>halted · {name.haltKind}</Pill>
          ) : age === "live" ? (
            <Pill tone="good" dot>trading</Pill>
          ) : (
            <Pill tone="warning" dot>{age}</Pill>
          )}
          <span className="lab-label ml-auto">{bot.id}</span>
        </Section>

        {name.halted ? (
          <Section className="border-l-2 border-l-[var(--lab-critical)] px-3 py-2 text-[12px] text-[var(--lab-ink-2)]">
            <span className="text-[var(--lab-critical)]">
              TRADING STOPPED ({name.haltKind})
            </span>{" "}
            — the bot is flat and still cycling.{" "}
            {name.haltKind === "daily"
              ? "A daily halt clears by itself at the next UTC midnight; nothing to do."
              : name.haltKind === "kill_switch"
                ? "Remove reports/STOP and it resumes on the next cycle."
                : "A terminal halt never self-clears — investigate, then delete the bot's *.risk.json."}
          </Section>
        ) : null}

        <Section className="grid grid-cols-2 lg:grid-cols-4">
          <Metric label="equity" value={fmtAmount(bot.equity, bot.currency, 2)} />
          <Metric label="pnl" value={fmtPct(bot.pnl_pct)}
                  tone={positive ? "good" : "critical"} sub="vs initial equity" />
          <Metric label="cash" value={fmtAmount(bot.cash, bot.currency, 2)}
                  sub={positionValue !== null
                    ? `${fmtAmount(positionValue, bot.currency, 0)} deployed`
                    : undefined} />
          <Metric label="invested"
                  value={bot.position_pct === null ? "—" : `${Math.round(bot.position_pct)}%`}
                  sub={`${bot.holdings_count ?? 0} position(s)`} />
        </Section>

        <Section>
          <Bar title="equity & drawdown" right={<span className="lab-label">{points.length} points</span>} />
          <div className="p-3">
            <EquityChart points={points} positive={positive} currency={bot.currency} />
          </div>
        </Section>

        <Section className="grid lg:grid-cols-[1fr_300px]">
          <div className="border-b border-[var(--lab-border)] lg:border-b-0 lg:border-r">
            <Bar title="holdings"
                 right={<span className="lab-label">
                   {bot.holdings ? Object.keys(bot.holdings).length : 0} symbols
                 </span>} />
            <HoldingsTable holdings={bot.holdings} equity={bot.equity} currency={bot.currency} />
          </div>
          <div>
            <Bar title="telemetry" />
            <div className="divide-y divide-[var(--lab-border)]">
              <KV k="strategy" v={bot.strategy} />
              <KV k="market" v={`${bot.market} · ${bot.currency ?? "USD"}`} />
              <KV k="total fills" v={bot.fills_count !== null ? String(bot.fills_count) : "—"} />
              <KV k="last action" v={bot.last_fill ?? "—"} />
              <KV k="last cycle" v={fmtRelative(new Date(seen).toISOString())} />
              <KV k="row synced" v={fmtRelative(bot.updated_at)} />
            </div>
          </div>
        </Section>
      </Frame>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/lab"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--lab-ink-3)] transition-colors hover:text-[var(--lab-accent)]">
      ← fleet
    </Link>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <span className="lab-label shrink-0">{k}</span>
      <span className="truncate text-[12px] tnum text-[var(--lab-ink-1)]">{v}</span>
    </div>
  );
}
