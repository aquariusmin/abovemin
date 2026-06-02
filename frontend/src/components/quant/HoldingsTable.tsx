import type { Holding } from "@/lib/quant";
import { fmtMoney } from "@/lib/quant";

// Per-symbol breakdown for the bot-detail page. `mark` / `value` can be
// null (exchange unreachable at sync time) — we still show the row so
// the position itself isn't hidden, just its current valuation.
export function HoldingsTable({
  holdings,
  equity,
}: {
  holdings: Record<string, Holding> | null;
  equity: number;
}) {
  if (!holdings || Object.keys(holdings).length === 0) {
    return (
      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest py-2">
        No open positions — bot is flat
      </p>
    );
  }
  const rows = Object.entries(holdings)
    .map(([symbol, h]) => ({ symbol, ...h }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-white/30 border-b border-white/8">
            <th className="text-left py-2 font-bold">Symbol</th>
            <th className="text-right py-2 font-bold">Qty</th>
            <th className="text-right py-2 font-bold">Mark</th>
            <th className="text-right py-2 font-bold">Value</th>
            <th className="text-right py-2 font-bold">% Eq</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => {
            const pct =
              r.value !== null && equity > 0 ? (r.value / equity) * 100 : null;
            return (
              <tr key={r.symbol} className="hover:bg-white/3 transition-colors">
                <td className="py-2 text-white/80">{r.symbol}</td>
                <td className="py-2 text-right text-white/70">
                  {r.qty.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                </td>
                <td className="py-2 text-right text-white/50">
                  {r.mark !== null ? fmtMoney(r.mark, 2) : "—"}
                </td>
                <td className="py-2 text-right text-white/80">
                  {r.value !== null ? fmtMoney(r.value, 2) : "—"}
                </td>
                <td className="py-2 text-right text-white/40">
                  {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
