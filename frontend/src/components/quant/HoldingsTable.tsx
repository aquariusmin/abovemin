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
      <p className="text-[11px] font-mono text-white/45 uppercase tracking-[0.18em] py-2">
        No open positions — bot is flat
      </p>
    );
  }
  const rows = Object.entries(holdings)
    .map(([symbol, h]) => ({ symbol, ...h }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.16em] text-white/40 border-b border-white/8">
            <th scope="col" className="text-left py-2.5 font-bold">Symbol</th>
            <th scope="col" className="text-right py-2.5 font-bold">Qty</th>
            <th scope="col" className="text-right py-2.5 font-bold">Mark</th>
            <th scope="col" className="text-right py-2.5 font-bold">Value</th>
            <th scope="col" className="text-right py-2.5 font-bold">% Eq</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((r) => {
            const pct =
              r.value !== null && equity > 0 ? (r.value / equity) * 100 : null;
            return (
              <tr key={r.symbol} className="hover:bg-white/[0.03] transition-colors">
                <td className="py-2.5 text-white/85">{r.symbol}</td>
                <td className="py-2.5 text-right text-white/70">
                  {r.qty.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                </td>
                <td className="py-2.5 text-right text-white/55">
                  {r.mark !== null ? fmtMoney(r.mark, 2) : "—"}
                </td>
                <td className="py-2.5 text-right text-white/85">
                  {r.value !== null ? fmtMoney(r.value, 2) : "—"}
                </td>
                <td className="py-2.5 text-right text-white/45">
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
