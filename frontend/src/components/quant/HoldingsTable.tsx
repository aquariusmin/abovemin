import type { Holding } from "@/lib/quant";
import { fmtAmount } from "@/lib/quant";
import { LAB_INK } from "@/components/quant/theme";

export function HoldingsTable({
  holdings,
  equity,
  currency,
}: {
  holdings: Record<string, Holding> | null;
  equity: number;
  currency: string | null;
}) {
  if (!holdings || Object.keys(holdings).length === 0) {
    return (
      <div className="px-3 py-4 text-[var(--lab-ink-3)]">FLAT · no open positions</div>
    );
  }
  const rows = Object.entries(holdings)
    .map(([symbol, h]) => ({ symbol, ...h }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="glass-inset border-b border-[var(--lab-border)]">
            {["symbol", "qty", "mark", "value", "weight"].map((h, i) => (
              <th key={h} className={`px-3 py-1.5 font-normal ${i === 0 ? "text-left" : "text-right"}`}>
                <span className="lab-label">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const w = r.value !== null && equity > 0 ? (r.value / equity) * 100 : null;
            return (
              <tr key={r.symbol} className="row-hover border-b border-[var(--lab-border)] last:border-0">
                <td className="px-3 py-1.5 text-[var(--lab-ink-1)]">{r.symbol}</td>
                <td className="px-3 py-1.5 text-right tnum text-[var(--lab-ink-1)]">
                  {r.qty.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                </td>
                <td className="px-3 py-1.5 text-right tnum text-[var(--lab-ink-2)]">
                  {fmtAmount(r.mark, currency, 2)}
                </td>
                <td className="px-3 py-1.5 text-right tnum text-[var(--lab-ink-1)]">
                  {fmtAmount(r.value, currency, 2)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {w !== null ? (
                    // The weight bar is the chart here: a value in a column of
                    // values is hard to rank at a glance, a proportional rule
                    // beside it is read instantly. One colour for every row —
                    // the length already encodes magnitude.
                    <span className="flex items-center justify-end gap-2">
                      <span className="h-[3px] w-14 shrink-0" style={{ background: "var(--lab-grid)" }} aria-hidden>
                        <span className="block h-full"
                              style={{ width: `${Math.min(100, w)}%`, background: LAB_INK.secondary }} />
                      </span>
                      <span className="w-10 tnum text-[var(--lab-ink-2)]">{w.toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="text-[var(--lab-ink-3)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
