// Mirrors `public.quant_fleet`; keep in lockstep with `quant_trading/supabase/schema.sql` upstream.

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
  /** Null when the baseline is over a day old — render "—", never 0. */
  day_pnl_pct: number | null;
  position_pct: number | null;
  holdings_count: number | null;
  holdings: Record<string, Holding> | null;
  fills_count: number | null;
  last_fill: string | null;
  cash: number | null;
  currency: string | null;
  mark: number | null;
  equity_curve: string | null;
  updated_at: string;
}

export interface EquityPoint {
  ts: number;
  equity: number;
}

// Best-effort decode: a malformed row fades to "no chart" instead of crashing the dashboard.
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

// Absolute dates are KST (Korean accounts); UTC labels put 00:00–09:00 KST on the previous day.
const KST = "Asia/Seoul";

const KST_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: KST,
  month: "2-digit",
  day: "2-digit",
});

const KST_YEAR_MONTH_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function fmtDateKst(ts: number): string {
  return KST_MONTH_DAY.format(ts);
}

export function fmtDayKst(ts: number): string {
  return KST_YEAR_MONTH_DAY.format(ts);
}

const KST_DATE_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtDateTimeKst(ts: number): string {
  // en-CA gives `2026-09-12, 06:00`; the comma is noise in a mono tooltip.
  return KST_DATE_TIME.format(ts).replace(", ", " ");
}

// 한 KST 날짜에 첫 지점 하나만 후보로 — recharts `minTickGap`만으로는 같은 라벨이 두 번 찍힌다.
export function dayTicks(stamps: number[], max = 8): number[] {
  const starts: number[] = [];
  let prevDay = "";
  for (const ts of stamps) {
    const day = fmtDayKst(ts);
    if (day !== prevDay) {
      starts.push(ts);
      prevDay = day;
    }
  }
  const step = Math.ceil(starts.length / max);
  const ticks = step > 1 ? starts.filter((_, i) => i % step === 0) : starts;
  const last = starts.at(-1);
  if (last !== undefined && ticks.at(-1) !== last) ticks.push(last);
  return ticks;
}

export function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

export function fleetTotalPnl(bots: FleetBot[]): { equity: number; pnl: number } {
  const equity = bots.reduce((s, b) => s + (b.equity ?? 0), 0);
  const initial = bots.reduce((s, b) => {
    if (b.pnl_pct === -100) return s;
    return s + b.equity / (1 + b.pnl_pct / 100);
  }, 0);
  const pnl = initial ? (equity / initial - 1) * 100 : 0;
  return { equity, pnl };
}

// Mirrors `quant_trading/quant_dashboard/lib/utils.ts`; `scripts/sync_dashboard.py` formats are the contract.

// "{TAG} / {strategy}{venue}{halt}", e.g. "NASDAQ100 / scanner [TOSS·REAL] ⛔ HALTED(daily)".
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

  // Split on the LAST " / ": a tag can contain a bare slash ("BTC/USDT / vb").
  const cut = rest.lastIndexOf(" / ");
  return {
    tag: (cut === -1 ? rest : rest.slice(0, cut)).trim() || raw,
    strategy: cut === -1 ? "" : rest.slice(cut + 3).trim(),
    venue,
    // Anything not explicitly a mock account is real money (the safe direction to be wrong).
    real: !!venue && !/MOCK/i.test(venue),
    halted,
    haltKind,
  };
}

export function lastCycle(points: EquityPoint[], syncedAt: string): number {
  const last = points.length ? points[points.length - 1].ts : NaN;
  return Number.isFinite(last) ? last : Date.parse(syncedAt);
}

// Not `updated_at` (the sync stamps it). `now` is a param so server and hydrating client agree.
export function staleness(
  lastSeen: number | string,
  now: number = Date.now(),
): "live" | "lagging" | "stale" {
  const t = typeof lastSeen === "number" ? lastSeen : Date.parse(lastSeen);
  if (!Number.isFinite(t)) return "stale";
  const hours = (now - t) / 3_600_000;
  if (hours <= 30) return "live";
  if (hours <= 72) return "lagging";
  return "stale";
}

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

// Deliberately no single fleet total: KRW/USD and mock/real money are not addable.
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

// Position in the sorted id list (hashing collided). Past the palette's length the map stops, not cycles.
export function buildSeriesColors(
  ids: string[],
  palette: readonly string[],
): Map<string, string> {
  return new Map(
    [...ids].sort().slice(0, palette.length).map((id, i) => [id, palette[i]]),
  );
}

export type FleetSortKey = "equity" | "pnl_pct" | "day_pnl_pct" | "updated_at" | "bot_name";
export type SortDir = "asc" | "desc";

const NUMERIC_SORT = new Set<FleetSortKey>(["equity", "pnl_pct", "day_pnl_pct"]);

export function sortBots(bots: FleetBot[], key: FleetSortKey, dir: SortDir): FleetBot[] {
  return [...bots].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (NUMERIC_SORT.has(key)) {
      const an = typeof av === "number" ? av : null;
      const bn = typeof bv === "number" ? bv : null;
      // Null sorts last in BOTH directions — "no number" is not a small number.
      if (an === null || bn === null) return an === bn ? 0 : an === null ? 1 : -1;
      return dir === "desc" ? bn - an : an - bn;
    }
    return dir === "desc"
      ? String(bv ?? "").localeCompare(String(av ?? ""))
      : String(av ?? "").localeCompare(String(bv ?? ""));
  });
}
