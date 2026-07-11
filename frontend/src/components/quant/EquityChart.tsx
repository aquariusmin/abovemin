"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EquityPoint } from "@/lib/quant";

// Full-size equity curve used on the bot-detail page. Styling mirrors
// /lab's existing chart section (grid stroke alpha, monospace ticks,
// 'rgba(255,255,255,...)' palette) so both views read as one site.
export function EquityChart({
  points,
  positive,
}: {
  points: EquityPoint[];
  positive: boolean;
}) {
  if (points.length < 2) {
    return (
      <div className="h-64 grid place-items-center">
        <p className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em]">
          No equity history yet
        </p>
      </div>
    );
  }
  const stroke = positive ? "#34d399" : "#f87171";
  const gradStart = positive ? "#34d399" : "#f87171";
  return (
    <div
      className="h-64 md:h-80 w-full"
      role="img"
      aria-label={`Equity curve over ${points.length} points, trending ${
        positive ? "up" : "down"
      }`}
    >
      <ResponsiveContainer>
        <AreaChart
          data={points}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="quantEquityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradStart} stopOpacity={0.18} />
              <stop offset="95%" stopColor={gradStart} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="ts"
            tick={{
              fontSize: 9,
              fill: "rgba(255,255,255,0.25)",
              fontFamily: "monospace",
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(ts) =>
              new Date(Number(ts)).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{
              fontSize: 9,
              fill: "rgba(255,255,255,0.25)",
              fontFamily: "monospace",
            }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) =>
              `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            }
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={(label) => new Date(Number(label)).toLocaleString()}
            formatter={(value) =>
              `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            }
            contentStyle={{
              backgroundColor: "rgba(26,28,26,0.96)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={1.5}
            fill="url(#quantEquityGrad)"
            dot={false}
            activeDot={{ r: 3, fill: stroke }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
