"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/quant";
import { LAB_STATUS } from "@/components/quant/theme";

/** Domain is the series' own min/max (zero-based would be flat); the colour never appears without the PnL. */
export function EquitySparkline({
  points,
  positive,
}: {
  points: EquityPoint[];
  positive: boolean;
}) {
  if (points.length < 2) {
    return <span className="text-[12px] text-[var(--lab-ink-3)]">—</span>;
  }
  const stroke = positive ? LAB_STATUS.good : LAB_STATUS.critical;
  return (
    <div className="h-[18px] w-20">
      {/* 컨테이너와 같은 크기(w-20 = 80px, h-[18px]) — 기본값 -1이면 recharts가 행마다 경고를 찍는다. */}
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 80, height: 18 }}>
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
