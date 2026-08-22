"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/quant";
import { LAB_STATUS } from "@/components/quant/theme";

/**
 * Row-level trend. No axes, no tooltip — the row's own figures carry the
 * values; this only has to show the shape.
 *
 * The domain is the series' own min/max rather than zero-based: at a fleet's
 * typical scale a zero-based sparkline is a flat line and shows nothing. The
 * colour is the reserved good/critical token (gain/loss is a good/bad
 * judgement, not an identity) and never appears without the signed PnL figure
 * in the adjacent cell.
 */
export function EquitySparkline({
  points,
  positive,
}: {
  points: EquityPoint[];
  positive: boolean;
}) {
  if (points.length < 2) {
    return <span className="text-[11px] text-[var(--lab-ink-3)]">—</span>;
  }
  const stroke = positive ? LAB_STATUS.good : LAB_STATUS.critical;
  return (
    <div className="h-[18px] w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 1, right: 0, bottom: 1, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={1.25}
            fill={stroke}
            fillOpacity={0.13}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
