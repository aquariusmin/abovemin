"use client";

import { useMemo } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { fmtAmount, type EquityPoint } from "@/lib/quant";
import { LAB_AXIS, LAB_GRID, LAB_INK, LAB_STATUS, LAB_TOOLTIP } from "@/components/quant/theme";

/**
 * One bot's equity, with its drawdown underneath.
 *
 * Two stacked panes rather than a dual axis: equity in currency and drawdown
 * in percent do not share a scale, and overlaying them on two y-axes would
 * invent an alignment the data does not have. Stacked, they share the x-axis
 * and stay honest.
 *
 * Drawdown earns its place because the fleet's L4 halt fires on drawdown, so
 * "how deep and how long" is the operational question — and that is exactly
 * what a headline equity line hides.
 */
export function EquityChart({
  points,
  positive,
  currency,
}: {
  points: EquityPoint[];
  positive: boolean;
  currency: string | null;
}) {
  const dd = useMemo(() => {
    // Plain loop rather than a closure over a running `peak`: the React
    // compiler (enabled site-wide) rejects reassigning a captured variable.
    const out: Array<{ ts: number; dd: number }> = [];
    let peak = -Infinity;
    for (const p of points) {
      if (p.equity > peak) peak = p.equity;
      out.push({ ts: p.ts, dd: peak > 0 ? (p.equity / peak - 1) * 100 : 0 });
    }
    return out;
  }, [points]);

  if (points.length < 2) {
    return (
      <div className="lab-prose grid h-64 place-items-center text-[var(--lab-ink-3)]">
        Not enough equity history yet.
      </div>
    );
  }

  // Gain/loss is a good/bad judgement, so it wears the reserved status tokens
  // rather than a series colour. The signed figure beside the chart is the
  // label that keeps this from being colour-alone.
  const stroke = positive ? LAB_STATUS.good : LAB_STATUS.critical;
  const fmtDate = (ts: number) => new Date(ts).toISOString().slice(5, 10);

  return (
    <div className="space-y-1">
      <div className="h-52 w-full">
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="labEqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={LAB_GRID} vertical={false} />
            <XAxis dataKey="ts" tickFormatter={fmtDate} {...LAB_AXIS} minTickGap={40} />
            <YAxis {...LAB_AXIS} width={64} domain={["auto", "auto"]}
                   tickFormatter={(v: number) => fmtAmount(v, currency, 0)} />
            <Tooltip
              contentStyle={LAB_TOOLTIP}
              cursor={{ stroke: LAB_INK.muted, strokeWidth: 1 }}
              labelFormatter={(l) =>
                new Date(Number(l)).toISOString().replace("T", " ").slice(0, 16) + "Z"}
              formatter={(v) => [fmtAmount(Number(v), currency, 2), "equity"]}
            />
            <Area type="monotone" dataKey="equity" stroke={stroke} strokeWidth={2}
                  fill="url(#labEqFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="lab-label px-1 pt-1">drawdown from peak</div>
      <div className="h-20 w-full">
        <ResponsiveContainer>
          <AreaChart data={dd} margin={{ top: 2, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={LAB_GRID} vertical={false} />
            <XAxis dataKey="ts" hide />
            <YAxis {...LAB_AXIS} width={64} domain={["auto", 0]}
                   tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
            <ReferenceLine y={0} stroke={LAB_INK.muted} strokeWidth={1} />
            <Tooltip
              contentStyle={LAB_TOOLTIP}
              cursor={{ stroke: LAB_INK.muted, strokeWidth: 1 }}
              labelFormatter={(l) => new Date(Number(l)).toISOString().slice(0, 10)}
              formatter={(v) => [`${Number(v).toFixed(2)}%`, "drawdown"]}
            />
            <Area type="monotone" dataKey="dd" stroke={LAB_STATUS.critical} strokeWidth={1.5}
                  fill={LAB_STATUS.critical} fillOpacity={0.14} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
