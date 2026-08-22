// Shared types + formatters for the quant fleet dashboard.
//
// Mirrors the `public.quant_fleet` Supabase table written by the
// dashboard-sync container on the NAS. Keep this in lockstep with that
// schema — see `quant_trading/supabase/schema.sql` upstream.

// `crypto` only survives for rows written before the crypto fleet was
// retired; nothing produces it now.
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
  /** Account currency. Null on rows written before the column existed. */
  currency: string | null;
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

/* ---------------------------------------------------------------------------
   Console additions.

   These mirror `quant_trading/quant_dashboard/lib/utils.ts` upstream. Keep the
   two in step — the string formats they parse are produced by
   `scripts/sync_dashboard.py`, which is the actual contract.
--------------------------------------------------------------------------- */

/**
 * Decompose the `bot_name` the sync job writes:
 *   "{TAG} / {strategy}{venue}{halt}"
 *   e.g. "NASDAQ100 / scanner [TOSS·REAL] ⛔ HALTED(daily)"
 *
 * The venue tag is the only thing separating mock-account equity from real
 * money, and a halted bot now idles instead of exiting — so it keeps syncing
 * and looks identical to a healthy one. Both are pulled out into their own
 * badges rather than left buried in a string.
 */
export type BotName = {
  tag: string;
  strategy: string;
  venue: string | null;
  real: boolean;
  halted: boolean;
  haltKind: string | null;
};

export function parseBotName(raw: string): BotName {
  let rest = raw;
  let halted = false;
  let haltKind: string | null = null;

  const halt = rest.match(/⛔\s*HALTED\(([^)]*)\)/);
  if (halt) {
    halted = true;
    haltKind = halt[1] || "unknown";
    rest = rest.replace(halt[0], "").trim();
  }

  let venue: string | null = null;
  const v = rest.match(/\[([^\]]+)\]/);
  if (v) {
    venue = v[1];
    rest = rest.replace(v[0], "").trim();
  }

  // Split on the LAST " / ": the writer joins with spaces around the slash,
  // but a tag can contain a bare one ("BTC/USDT / vb").
  const cut = rest.lastIndexOf(" / ");
  return {
    tag: (cut === -1 ? rest : rest.slice(0, cut)).trim() || raw,
    strategy: cut === -1 ? "" : rest.slice(cut + 3).trim(),
    venue,
    // Anything not explicitly a mock account is real money. Defaulting the
    // other way would be the dangerous direction to be wrong in.
    real: !!venue && !/MOCK/i.test(venue),
    halted,
    haltKind,
  };
}

/** The bot's own last cycle, falling back to the sync stamp. */
export function lastCycle(points: EquityPoint[], syncedAt: string): number {
  const last = points.length ? points[points.length - 1].ts : NaN;
  return Number.isFinite(last) ? last : Date.parse(syncedAt);
}

/**
 * Is the BOT still cycling?
 *
 * Deliberately not `updated_at` — that is stamped by the sync container, so a
 * bot dead for weeks keeps a fresh-looking row while the sync lives. Feed it
 * `lastCycle`. Thresholds match the daily cadence every bot here runs on.
 */
export function staleness(lastSeen: number | string): "live" | "lagging" | "stale" {
  const t = typeof lastSeen === "number" ? lastSeen : Date.parse(lastSeen);
  if (!Number.isFinite(t)) return "stale";
  const hours = (Date.now() - t) / 3_600_000;
  if (hours <= 30) return "live";
  if (hours <= 72) return "lagging";
  return "stale";
}

/** Currency-aware money — the fleet holds USD and KRW accounts side by side. */
export function fmtAmount(
  n: number | null | undefined,
  currency: string | null | undefined,
  digits?: number,
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const ccy = (currency || "USD").toUpperCase();
  if (ccy === "KRW") return `₩${Math.round(n).toLocaleString("en-US")}`;
  const d = digits ?? 2;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })}`;
}

export type Book = { currency: string; equity: number; pnl: number; count: number };

/**
 * Fleet totals grouped by (real money?, currency).
 *
 * There is deliberately no single "fleet equity" figure. A KRW domestic
 * account and a USD overseas account are not addable, and mock equity is not
 * addable to real money — blending them would let a paper profit flatter a
 * real loss, which is the number you must not get wrong.
 */
export function books(bots: FleetBot[]): { real: Book[]; sim: Book[] } {
  const bucket = new Map<string, Book>();
  for (const b of bots) {
    const real = parseBotName(b.bot_name).real;
    const ccy = (b.currency || "USD").toUpperCase();
    const key = `${real ? "R" : "S"}:${ccy}`;
    const acc = bucket.get(key) ?? { currency: ccy, equity: 0, pnl: 0, count: 0 };
    acc.equity += b.equity ?? 0;
    acc.pnl += b.pnl_pct === -100 ? 0 : b.equity / (1 + b.pnl_pct / 100);
    acc.count += 1;
    bucket.set(key, acc);
  }
  const out = { real: [] as Book[], sim: [] as Book[] };
  for (const [key, acc] of bucket) {
    const start = acc.pnl;
    acc.pnl = start ? (acc.equity / start - 1) * 100 : 0;
    (key.startsWith("R") ? out.real : out.sim).push(acc);
  }
  const bySize = (a: Book, z: Book) => z.equity - a.equity;
  out.real.sort(bySize);
  out.sim.sort(bySize);
  return out;
}

/**
 * Assign a colour per bot from `palette`, across the whole fleet.
 *
 * Hashing the id collided — with eight bots three drew in the same colour, so
 * the chart had fewer colours than series. Position in the sorted id list is
 * collision-free and still never repaints a survivor when the table is
 * filtered, because the order comes from every row, not the visible ones. Past
 * the palette's length the map STOPS rather than cycling; callers draw the
 * overflow neutrally and say so. The palette is passed in rather than imported
 * so the validated set stays beside the other chart tokens.
 */
export function buildSeriesColors(
  ids: string[],
  palette: readonly string[],
): Map<string, string> {
  return new Map(
    [...ids].sort().slice(0, palette.length).map((id, i) => [id, palette[i]]),
  );
}
