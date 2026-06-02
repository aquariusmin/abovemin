// Shared types + formatters for the quant fleet dashboard.
//
// Mirrors the `public.quant_fleet` Supabase table written by the
// dashboard-sync container on the NAS. Keep this in lockstep with that
// schema — see `quant_trading/supabase/schema.sql` upstream.

export type Market = "crypto" | "stock";

export interface Holding {
  qty: number;
  mark: number | null;
  value: number | null;
}

export interface FleetBot {
  id: string;
  bot_name: string;
  strategy: string;
  market: Market;
  equity: number;
  pnl_pct: number;
  position_pct: number | null;
  holdings_count: number | null;
  holdings: Record<string, Holding> | null;
  fills_count: number | null;
  last_fill: string | null;
  cash: number | null;
  mark: number | null;
  equity_curve: string | null;
  updated_at: string;
}

export interface EquityPoint {
  ts: number;
  equity: number;
}

// equity_curve is stored as a JSON-encoded string by sync_dashboard.py
// (`[[iso_ts, equity], ...]`, last 90 points). Decoding is best-effort
// — a malformed row should fade to "no chart" instead of crashing the
// whole dashboard.
export function parseEquityCurve(raw: string | null): EquityPoint[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Array<[number | string, number]>;
    return arr.map(([ts, equity]) => ({
      ts: typeof ts === "string" ? Date.parse(ts) : Number(ts),
      equity: Number(equity),
    }));
  } catch {
    return [];
  }
}

export function fmtMoney(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

// Aggregate the fleet's nominal initial equity by reversing each bot's
// PnL%. Used both for the overview KPI and for the detail page so the
// two surfaces report the same number.
export function fleetTotalPnl(bots: FleetBot[]): { equity: number; pnl: number } {
  const equity = bots.reduce((s, b) => s + (b.equity ?? 0), 0);
  const initial = bots.reduce((s, b) => {
    if (b.pnl_pct === -100) return s;
    return s + b.equity / (1 + b.pnl_pct / 100);
  }, 0);
  const pnl = initial ? (equity / initial - 1) * 100 : 0;
  return { equity, pnl };
}
