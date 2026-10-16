/**
 * Shapes of the files the owner's PC uploads (market-intelligence-dashboard,
 * `scripts/mi/publish.py`, schema `mi-web/1`). Only the fields the pages read are
 * typed; everything is optional because the producer is another repository and
 * a missing field must render as "없음", never crash the page.
 */

export const MARKET_KEYS = ['sp', 'nq', 'ks', 'kq'] as const;
export type MarketKey = (typeof MARKET_KEYS)[number];
export const HORIZONS = ['1', '5', '20'] as const;
export type Horizon = (typeof HORIZONS)[number];

export type Risk = {
  score?: number | null;
  level?: string;
  level_ko?: string;
  components?: Record<string, number | null>;
  components_available?: string;
  components_missing?: string[];
};

export type RegimeHistoryPoint = { date: string; regime?: string; risk?: number | null; close?: number };

export type Regime = {
  status?: string;
  reason?: string;
  as_of?: string;
  regime?: string;
  regime_since?: string;
  regime_days?: number;
  trend_score?: number;
  pending_days?: number;
  short_term?: string;
  medium_term?: string;
  metrics?: Record<string, number | null>;
  risk?: Risk;
  bullish_factors?: string[];
  bearish_factors?: string[];
  history?: RegimeHistoryPoint[];
  transitions?: { date: string; from: string; to: string }[];
};

export type MarketIndicators = Record<string, number | null | undefined>;

export type MarketEntry = {
  name: string;
  label?: string;
  proxy?: string | null;
  status: 'ok' | 'unavailable';
  reason?: string;
  source_id?: string;
  as_of?: string;
  provisional?: string[];
  indicators?: MarketIndicators;
  /** [date, close] pairs, oldest first, at most five years. */
  rows?: [string, number][];
  regime?: Regime;
};

export type ForecastEntry = {
  horizon?: number;
  bullish_probability?: number;
  neutral_probability?: number;
  bearish_probability?: number;
  model_name?: string;
  status?: string;
  validation_reasons?: string[];
  input_cutoff?: string;
  expected_outcome_date?: string;
  threshold?: number;
  reason?: string;
};

export type ForecastHistoryRow = {
  id: number;
  created_at: string;
  market: MarketKey;
  horizon: number;
  model_name: string;
  input_cutoff: string;
  p_bull: number;
  p_neutral: number;
  p_bear: number;
  expected_outcome_date?: string;
  validation_status?: string;
  /** 'pending' until the h-th close is known, then 'evaluated'. */
  status?: string;
  predicted_class?: 'bullish' | 'neutral' | 'bearish';
  actual_class?: 'bullish' | 'neutral' | 'bearish' | null;
  actual_return?: number | null;
  hit?: boolean | null;
  /** Recorded after the next session had opened: shown, but not counted as a timely call. */
  late?: boolean;
};

export type Forecast = {
  generated_at?: string;
  markets?: Partial<Record<MarketKey, Partial<Record<Horizon, ForecastEntry>>>>;
  history?: ForecastHistoryRow[];
};

export type MacroSeries = {
  name?: string;
  unit?: string;
  source_id?: string;
  as_of?: string;
  value?: number | null;
  chg5?: number | null;
  chg20?: number | null;
  history?: { date: string; value: number }[];
};

export type ReferenceIndicator = {
  name?: string;
  unit?: string;
  value?: number | null;
  observation_date?: string | null;
  change?: number | null;
  change_unit?: string;
  status?: string;
  error?: string | null;
  source?: string;
};

export type EventItem = { date: string; title: string; url?: string; source?: string };

export type Briefing = {
  generated_at?: string;
  session?: string;
  method?: string;
  llm_status?: string;
  sections?: {
    executive_summary?: string;
    daily_summary?: string[];
    us_overview?: string[];
    korea_overview?: string[];
    bullish_factors?: string[];
    bearish_factors?: string[];
    market_forecast?: string[];
    outlook_changes?: string[];
    events_to_watch?: EventItem[];
  };
  disclaimer?: string;
  input_warnings?: string[];
};

export type JobRun = { job: string; started_at: string; finished_at?: string | null; status: string; message?: string | null };

export type Status = {
  generated_at?: string;
  engine_version?: string;
  last_jobs?: Record<string, JobRun>;
  jobs?: JobRun[];
  storage?: { integrity?: string; schema_version?: number; size_bytes?: number };
};

export type Core = {
  schema: string;
  generated_at: string;
  engine_version?: string;
  notice?: string;
  markets: Partial<Record<MarketKey, MarketEntry>>;
  macro?: Record<string, MacroSeries> | null;
  reference_macro?: { indicators?: Record<string, ReferenceIndicator> } | null;
  briefing?: Briefing | null;
  forecast?: Forecast | null;
  status?: Status | null;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at?: string | null;
  collected_at?: string;
  category?: string;
  sentiment_label?: string | null;
  sentiment_method?: string;
  importance?: number;
  related_markets?: MarketKey[];
};

export type Disclosure = {
  date: string;
  company: string;
  report: string;
  kind?: string;
  amended?: boolean;
  market: MarketKey;
  url: string;
};

export type News = {
  generated_at?: string;
  items?: NewsItem[];
  report?: Record<string, { status?: string; items?: number; error?: string | null } | number>;
  sentiment_note?: string;
  disclosures?: {
    status?: string;
    error?: string | null;
    scope?: string;
    fetched_at?: string;
    items?: Disclosure[];
    truncated?: string[];
  };
};

export type EconomicsVariant = {
  status?: string;
  reason?: string;
  periods?: number;
  trades?: number;
  hit_rate?: number | null;
  strategy_total?: number;
  buy_hold_total?: number;
  strategy_max_drawdown?: number;
  buy_hold_max_drawdown?: number;
  mean_excess_vs_hold?: number;
  excess_ci90?: [number, number];
  verdict?: string;
  round_trip_cost?: number;
};

export type ModelMetrics = {
  n?: number;
  accuracy?: number;
  balanced_accuracy?: number;
  brier?: number;
  log_loss?: number;
  ece?: number;
  effective_n?: number;
  vs_class_frequency?: { ci90_low?: number; ci90_high?: number };
  validation?: { status?: string; reasons?: string[] };
};

export type PerformanceEntry = {
  status?: string;
  reason?: string;
  primary_model?: string;
  spans?: { development?: [string, string]; holdout?: [string, string] };
  models?: Record<string, ModelMetrics>;
  economics?: Partial<Record<'same_close' | 'next_open' | 'next_close', EconomicsVariant>>;
};

export type Performance = {
  generated_at?: string;
  markets?: Partial<Record<MarketKey, Partial<Record<Horizon, PerformanceEntry>>>>;
};

export type Bundle = { core: Core; news: News | null; performance: Performance | null };
