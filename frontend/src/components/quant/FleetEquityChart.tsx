"use client";

import { useMemo } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import {
  dayTicks, fmtDateKst, fmtDayKst, parseBotName, parseEquityCurve, type FleetBot,
} from "@/lib/quant";
import { LAB_AXIS, LAB_GRID, LAB_INK, LAB_TOOLTIP } from "@/components/quant/theme";

/** Indexed to 100 at each bot's first point: funding differs, and two y-scales would invent a correlation. */
export function FleetEquityChart({
  bots,
  colors,
}: {
  bots: FleetBot[];
  colors: Map<string, string>;
}) {
  const { data, series, omitted, ticks } = useMemo(() => {
    const all = bots
      .map((b) => ({ bot: b, points: parseEquityCurve(b.equity_curve) }))
      .filter((x) => x.points.length >= 2);
    // Only bots that own a colour are plotted; the unpainted count is shown under the chart, never cycled.
    const perBot = all.filter((x) => colors.has(x.bot.id));
    const omitted = all.length - perBot.length;

    const stamps = Array.from(
      new Set(perBot.flatMap((b) => b.points.map((p) => p.ts))),
    ).sort((a, z) => a - z);

    const rows = stamps.map((ts) => {
      const point: Record<string, number> = { ts };
      for (const b of perBot) {
        const base = b.points[0].equity;
        if (!base) continue;
        let v: number | undefined;
        for (const p of b.points) {
          if (p.ts > ts) break;
          v = p.equity;
        }
        if (v !== undefined) point[b.bot.id] = (v / base) * 100;
      }
      return point;
    });

    // Tags repeat across legacy rows, so disambiguate from the strategy's tail, where the parameters differ.
    const tags = perBot.map((b) => parseBotName(b.bot.bot_name));
    const dupes = new Set(
      tags.map((t) => t.tag).filter((t, i, a) => a.indexOf(t) !== i),
    );
    const tail = (v: string, n = 14) => (v.length > n ? `…${v.slice(-n)}` : v);
    const labels = perBot.map((b, i) =>
      dupes.has(tags[i].tag)
        ? `${tags[i].tag} ${tail(tags[i].strategy || b.bot.id)}`
        : tags[i].tag,
    );
    labels.forEach((l, i) => {
      if (labels.indexOf(l) !== i) labels[i] = `${l} ${tail(perBot[i].bot.id, 6)}`;
    });

    return {
      data: rows,
      omitted,
      ticks: dayTicks(stamps),
      series: perBot.map((b, i) => ({
        id: b.bot.id,
        label: labels[i],
        color: colors.get(b.bot.id) as string,
      })),
    };
  }, [bots, colors]);

  if (series.length === 0) {
    return (
      <div className="lab-prose grid h-56 place-items-center text-[var(--lab-ink-3)]">
        No equity history yet.
      </div>
    );
  }

  return (
    <div>
      {/* A legend is always present for >= 2 series, so identity never rests on
          colour alone. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-[2px] w-3 shrink-0" style={{ background: s.color }} aria-hidden />
            <span className="lab-mono text-[11px] tracking-wide text-[var(--lab-ink-2)]">{s.label}</span>
          </span>
        ))}
        <span className="lab-label ml-auto">
          {omitted > 0 ? `${omitted} not plotted · ` : ""}indexed · first obs = 100 · KST
        </span>
      </div>
      <div className="h-56 w-full">
        {/* 높이는 위의 `h-56`(224px)과 같아야 한다 — 기본값 -1로 측정하면 recharts가 경고를 찍는다. */}
        <ResponsiveContainer initialDimension={{ width: 640, height: 224 }}>
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={LAB_GRID} vertical={false} />
            <XAxis dataKey="ts" ticks={ticks} tickFormatter={fmtDateKst} {...LAB_AXIS} minTickGap={32} />
            <YAxis {...LAB_AXIS} width={44} domain={["auto", "auto"]}
                   tickFormatter={(v: number) => v.toFixed(0)} />
            <ReferenceLine y={100} stroke={LAB_INK.muted} strokeWidth={1} />
            <Tooltip
              contentStyle={LAB_TOOLTIP}
              cursor={{ stroke: LAB_INK.muted, strokeWidth: 1 }}
              labelFormatter={(l) => `${fmtDayKst(Number(l))} KST`}
              formatter={(value, name) => [
                Number(value).toFixed(1),
                series.find((s) => s.id === name)?.label ?? String(name),
              ]}
            />
            {series.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color}
                    strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
