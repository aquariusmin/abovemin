"use client";

import { useMemo } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { parseBotName, parseEquityCurve, type FleetBot } from "@/lib/quant";
import { LAB_AXIS, LAB_GRID, LAB_INK, LAB_TOOLTIP } from "@/components/quant/theme";

/**
 * Every bot's equity on ONE axis, indexed to 100 at its own first point.
 *
 * Indexing is what makes the comparison legal. The bots are funded very
 * differently — a $700 real account beside a $10k mock — so raw equity would
 * either need two y-scales (never: the alignment between them is arbitrary and
 * invents a correlation the data does not contain) or would flatten the small
 * account into the axis. On a common base of 100 the chart encodes relative
 * performance and nothing else, which is the actual question.
 */
export function FleetEquityChart({
  bots,
  colors,
}: {
  bots: FleetBot[];
  colors: Map<string, string>;
}) {
  const { data, series, omitted } = useMemo(() => {
    const all = bots
      .map((b) => ({ bot: b, points: parseEquityCurve(b.equity_curve) }))
      .filter((x) => x.points.length >= 2);
    // Only bots that own a colour are plotted: past the palette's slots there
    // is no legal hue left, and cycling would put two bots on one colour. The
    // count of the unpainted is surfaced under the chart, never swallowed.
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

    // Tags repeat across legacy rows (three bots all called BTC/USDT), so a
    // bare-tag legend cannot tell lines apart. Disambiguate from the TAIL of
    // the strategy string, where the distinguishing parameters live
    // ("…entry55_exit20"); the heads are identical.
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
      series: perBot.map((b, i) => ({
        id: b.bot.id,
        label: labels[i],
        color: colors.get(b.bot.id) as string,
      })),
    };
  }, [bots, colors]);

  if (series.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-[12px] text-[var(--lab-ink-3)]">
        No equity history yet.
      </div>
    );
  }

  const fmtDate = (ts: number) =>
    new Date(ts).toISOString().slice(5, 10).replace("-", "/");

  return (
    <div>
      {/* A legend is always present for >= 2 series, so identity never rests on
          colour alone. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-[2px] w-3 shrink-0" style={{ background: s.color }} aria-hidden />
            <span className="text-[11px] tracking-wide text-[var(--lab-ink-2)]">{s.label}</span>
          </span>
        ))}
        <span className="lab-label ml-auto">
          {omitted > 0 ? `${omitted} not plotted · ` : ""}indexed · first obs = 100
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={LAB_GRID} vertical={false} />
            <XAxis dataKey="ts" tickFormatter={fmtDate} {...LAB_AXIS} minTickGap={40} />
            <YAxis {...LAB_AXIS} width={44} domain={["auto", "auto"]}
                   tickFormatter={(v: number) => v.toFixed(0)} />
            {/* Break-even. A solid hairline — a dashed rule would read as a
                projection when it is simply the origin. */}
            <ReferenceLine y={100} stroke={LAB_INK.muted} strokeWidth={1} />
            <Tooltip
              contentStyle={LAB_TOOLTIP}
              cursor={{ stroke: LAB_INK.muted, strokeWidth: 1 }}
              labelFormatter={(l) => new Date(Number(l)).toISOString().slice(0, 10)}
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
