/**
 * Pure display logic for /lab/markets. No React, no I/O — covered by
 * `src/lib/__tests__/markets-view.test.ts`.
 */
import type { ForecastHistoryRow, Horizon, MarketKey } from './types';

export type Tone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical';

export const MARKET_ORDER: MarketKey[] = ['sp', 'nq', 'ks', 'kq'];

export const REGIME_KO: Record<string, string> = {
  'Bullish / Low Volatility': '상승 · 낮은 변동성',
  'Bullish / High Volatility': '상승 · 높은 변동성',
  'Bearish / Low Volatility': '하락 · 낮은 변동성',
  'Bearish / High Volatility': '하락 · 높은 변동성',
  'Sideways / Neutral': '횡보 · 중립',
};

export function regimeKo(regime: string | undefined): string {
  return regime ? (REGIME_KO[regime] ?? regime) : '판정 없음';
}

/** Direction carries the tone; the pill always carries the words as well. */
export function regimeTone(regime: string | undefined): Tone {
  if (!regime) return 'neutral';
  if (regime.startsWith('Bullish')) return 'good';
  if (regime.startsWith('Bearish')) return regime.includes('High') ? 'critical' : 'serious';
  return 'neutral';
}

export function riskTone(level: string | undefined): Tone {
  return ({ Low: 'good', Moderate: 'neutral', Elevated: 'warning', High: 'critical' } as Record<string, Tone>)[level ?? ''] ?? 'neutral';
}

/**
 * The dashboard's rule: a probability that did not pass the fixed validation
 * gate is shown as untrustworthy, never as a plain number.
 */
export function validationLabel(status: string | undefined): { text: string; tone: Tone } {
  if (status === 'validated') return { text: '검증 통과', tone: 'good' };
  if (status === 'not_validated') return { text: '신뢰할 수 없음', tone: 'warning' };
  return { text: '검증 없음', tone: 'neutral' };
}

export function fmtPct(value: number | null | undefined, digits = 1, { ratio = false, signed = false } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const v = ratio ? value * 100 : value;
  const s = v.toFixed(digits);
  return `${signed && v > 0 ? '+' : ''}${s}%`;
}

export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

export function fmtKst(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${KST.format(d)} KST`;
}

/** Hours since an ISO timestamp, and whether the data should be called stale. */
export function freshness(iso: string | null | undefined, now: number): { hours: number | null; tone: Tone } {
  if (!iso) return { hours: null, tone: 'critical' };
  const hours = (now - new Date(iso).getTime()) / 3_600_000;
  if (!Number.isFinite(hours)) return { hours: null, tone: 'critical' };
  return { hours, tone: hours <= 20 ? 'good' : hours <= 72 ? 'warning' : 'critical' };
}

export const RANGES = { '3M': 92, '6M': 183, '1Y': 365, '3Y': 1096, '5Y': 1827 } as const;
export type RangeKey = keyof typeof RANGES;

/** Rows within `days` calendar days of the last row (the last close, not "today"). */
export function sliceRange<T extends [string, number]>(rows: readonly T[], range: RangeKey): T[] {
  if (rows.length === 0) return [];
  const last = Date.parse(rows[rows.length - 1][0]);
  const from = last - RANGES[range] * 86_400_000;
  return rows.filter(r => Date.parse(r[0]) >= from);
}

/**
 * Trailing simple moving average over the FULL series, then sliced by the
 * caller — computing it on the visible slice would leave the first n-1 points
 * of every range empty. `null` until n closes exist (never a partial average).
 */
export function sma(rows: readonly [string, number][], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < rows.length; i++) {
    sum += rows[i][1];
    if (i >= n) sum -= rows[i - n][1];
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

export type LiveRecord = { evaluated: number; hits: number; late: number; pending: number };

/** Live (not backtest) forecasts of one market × horizon. Late calls are counted apart, never as hits. */
export function liveRecord(history: readonly ForecastHistoryRow[], market: MarketKey, horizon: Horizon): LiveRecord {
  const rows = history.filter(r => r.market === market && String(r.horizon) === horizon);
  const done = rows.filter(r => r.status === 'evaluated');
  const timely = done.filter(r => !r.late);
  return {
    evaluated: timely.length,
    hits: timely.filter(r => r.hit === true).length,
    late: done.length - timely.length,
    pending: rows.filter(r => r.status === 'pending').length,
  };
}

export function marketParam(raw: string | string[] | undefined): MarketKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (MARKET_ORDER as string[]).includes(v ?? '') ? (v as MarketKey) : 'ks';
}

const CLASS_KO = { bullish: '상승', neutral: '횡보', bearish: '하락' } as const;
export function classKo(c: string | null | undefined): string {
  return c && c in CLASS_KO ? CLASS_KO[c as keyof typeof CLASS_KO] : '—';
}
