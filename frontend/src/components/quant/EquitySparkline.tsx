"use client";

import type { EquityPoint } from "@/lib/quant";
import { trend } from "@/lib/palette";

// Tiny inline SVG sparkline. Matches the existing FleetGrid style
// (polyline, no axes, no animation) so the table feels native to the
// rest of /lab.
export function EquitySparkline({
  points,
  positive,
}: {
  points: EquityPoint[];
  positive: boolean;
}) {
  if (points.length < 2) {
    return <span className="text-[9px] font-mono text-white/55">—</span>;
  }
  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stroke = positive ? trend.up : trend.down;
  return (
    <svg
      viewBox={`0 0 ${values.length - 1} 20`}
      preserveAspectRatio="none"
      className="w-20 h-5"
      role="img"
      aria-label={`Equity trend ${positive ? "up" : "down"}`}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        points={values
          .map((v, i) => `${i},${20 - ((v - min) / range) * 18}`)
          .join(" ")}
      />
    </svg>
  );
}
