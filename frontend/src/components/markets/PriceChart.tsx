"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { LAB_AXIS, LAB_GRID, LAB_INK, LAB_SERIES, LAB_TOOLTIP } from "@/components/quant/theme";
import { RANGES, sliceRange, sma, type RangeKey } from "@/lib/markets/view";

const AVERAGES = [
  { n: 20, key: "sma20", color: LAB_SERIES[1], dash: "4 3" },
  { n: 60, key: "sma60", color: LAB_SERIES[3], dash: "6 3" },
  { n: 200, key: "sma200", color: LAB_SERIES[2], dash: "2 3" },
] as const;

type Point = { date: string; close: number; provisional: boolean } & Partial<Record<(typeof AVERAGES)[number]["key"], number | null>>;

/**
 * Close with trailing 20/60/200-day averages. Averages are computed on the
 * whole series and only then cut to the visible range, so a short range does
 * not open with an empty stretch. A provisional close (Toss, before KRX
 * publishes) is marked in the tooltip rather than passed off as official.
 */
export function PriceChart({
  rows,
  provisional,
  label,
}: {
  rows: [string, number][];
  provisional: string[];
  label: string;
}) {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [shown, setShown] = useState<Record<string, boolean>>({ sma20: true, sma60: false, sma200: true });

  const averages = AVERAGES.map((a) => sma(rows, a.n));
  const pending = new Set(provisional);
  const all: Point[] = rows.map(([date, close], i) => ({
    date,
    close,
    provisional: pending.has(date),
    sma20: averages[0][i],
    sma60: averages[1][i],
    sma200: averages[2][i],
  }));
  const visible = sliceRange(rows, range).length;
  const data = all.slice(all.length - visible);
  const first = data[0]?.close;
  const last = data[data.length - 1]?.close;
  const change = first && last ? (last / first - 1) * 100 : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3">
        <div role="group" aria-label="기간" className="flex gap-1">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={
                "lab-pill tnum " +
                (range === r
                  ? "border-[var(--lab-good)]/45 bg-[var(--lab-accent-wash)] text-[var(--lab-good)]"
                  : "text-[var(--lab-ink-2)] hover:text-[var(--lab-ink-1)]")
              }
            >
              {r}
            </button>
          ))}
        </div>
        <div role="group" aria-label="이동평균" className="flex flex-wrap gap-3">
          {AVERAGES.map((a) => (
            <label key={a.key} className="lab-label flex cursor-pointer items-center gap-1.5 normal-case tracking-[0.08em]">
              <input
                type="checkbox"
                checked={shown[a.key]}
                onChange={(e) => setShown({ ...shown, [a.key]: e.target.checked })}
                className="accent-[var(--lab-accent)]"
              />
              <span aria-hidden className="inline-block h-0 w-4 border-t-2" style={{ borderColor: a.color, borderStyle: "dashed" }} />
              SMA{a.n}
            </label>
          ))}
        </div>
        <span className="tnum ml-auto text-[12px] text-[var(--lab-ink-2)]">
          {range} 변화{" "}
          <span className={change === null ? "" : change >= 0 ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]"}>
            {change === null ? "—" : `${change >= 0 ? "▲ +" : "▼ "}${change.toFixed(2)}%`}
          </span>
        </span>
      </div>
      <div className="h-[260px] px-1 pb-2 pt-3 sm:h-[320px]" role="img" aria-label={`${label} 종가 차트, ${range}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={LAB_GRID} vertical={false} />
            <XAxis
              dataKey="date"
              {...LAB_AXIS}
              minTickGap={48}
              tickFormatter={(d: string) => (range === "3M" || range === "6M" ? d.slice(5) : d.slice(0, 7))}
            />
            <YAxis
              {...LAB_AXIS}
              width={56}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            />
            <Tooltip
              contentStyle={LAB_TOOLTIP}
              labelStyle={{ color: LAB_INK.muted, marginBottom: 4 }}
              formatter={(value, name, item) => {
                const v = typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
                const tag = name === "종가" && (item?.payload as Point | undefined)?.provisional ? " (잠정)" : "";
                return [`${v}${tag}`, name];
              }}
            />
            <Line type="monotone" dataKey="close" name="종가" stroke={LAB_SERIES[0]} strokeWidth={1.75} dot={false} isAnimationActive={false} />
            {AVERAGES.filter((a) => shown[a.key]).map((a) => (
              <Line
                key={a.key}
                type="monotone"
                dataKey={a.key}
                name={`SMA${a.n}`}
                stroke={a.color}
                strokeWidth={1.25}
                strokeDasharray={a.dash}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
