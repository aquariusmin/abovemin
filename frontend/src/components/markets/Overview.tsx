import Link from "next/link";
import { Bar, Frame, Metric, Pill, Section, cx } from "@/components/quant/Panel";
import { PriceChart } from "@/components/markets/PriceChart";
import type { Briefing, Core, ForecastEntry, Horizon, MarketEntry, MarketKey, ReferenceIndicator } from "@/lib/markets/types";
import { HORIZONS } from "@/lib/markets/types";
import {
  MARKET_ORDER, classKo, fmtNum, fmtPct, liveRecord, regimeKo, regimeTone, riskTone, validationLabel,
} from "@/lib/markets/view";

/* ── Market strip ─────────────────────────────────────────────────────────── */

function dayChange(m: MarketEntry): number | null {
  const r = m.rows ?? [];
  return r.length >= 2 ? (r[r.length - 1][1] / r[r.length - 2][1] - 1) * 100 : null;
}

/** Four cells, one per market; the selected one carries the forest edge. Links, not buttons: the market is in the URL. */
export function MarketStrip({ markets, active }: { markets: Core["markets"]; active: MarketKey }) {
  return (
    <Frame>
      <nav aria-label="시장 선택" className="grid grid-cols-2 lg:grid-cols-4">
        {MARKET_ORDER.map((k, i) => {
          const m = markets[k];
          const ok = m?.status === "ok";
          const last = ok ? m.rows?.[m.rows.length - 1]?.[1] : undefined;
          const chg = ok && m ? dayChange(m) : null;
          return (
            <Link
              key={k}
              href={`/lab/markets?m=${k}`}
              aria-current={active === k ? "page" : undefined}
              className={cx(
                "relative min-w-0 border-[var(--lab-border)] px-4 py-3.5 transition-colors",
                i % 2 === 0 ? "border-r" : "lg:border-r",
                i >= 2 && "border-t lg:border-t-0",
                i === 3 && "lg:border-r-0",
                active === k ? "bg-[var(--lab-accent-wash)]" : "hover:bg-[var(--lab-accent-wash)]/60",
              )}
            >
              {active === k ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[var(--lab-accent)]" /> : null}
              <div className="lab-label mb-2 truncate">{m?.label ?? m?.name ?? k}</div>
              <div className="tnum truncate text-[22px] leading-none">{ok ? fmtNum(last, 2) : "—"}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                <span className={cx("tnum", chg === null ? "text-[var(--lab-ink-3)]" : chg >= 0 ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]")}>
                  {chg === null ? "—" : `${chg >= 0 ? "▲" : "▼"} ${fmtPct(chg, 2, { signed: true })}`}
                </span>
                {ok ? <Pill tone={regimeTone(m?.regime?.regime)}>{regimeKo(m?.regime?.regime)}</Pill> : <Pill>없음</Pill>}
              </div>
            </Link>
          );
        })}
      </nav>
    </Frame>
  );
}

/* ── Price + regime ───────────────────────────────────────────────────────── */

const RISK_KO: Record<string, string> = {
  realized_vol: "실현 변동성", drawdown: "고점 대비 낙폭", vix: "VIX", credit: "신용 스프레드", rates: "금리", krw: "원화",
};

export function MarketDetail({ market }: { market: MarketEntry }) {
  const r = market.regime ?? {};
  const met = r.metrics ?? {};
  const risk = r.risk ?? {};
  const prov = market.provisional ?? [];
  return (
    <Frame>
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Section className="min-w-0 lg:border-b-0 lg:border-r">
          <Bar
            title={`${market.label ?? market.name} · 종가`}
            right={
              <span className="lab-label normal-case tracking-[0.06em]">
                기준일 {market.as_of ?? "—"}
                {prov.length ? ` · ${prov.join(", ")} 잠정치` : ""}
              </span>
            }
          />
          <PriceChart rows={market.rows ?? []} provisional={prov} label={market.label ?? market.name} />
          <div className="lab-stats grid grid-cols-2 border-t border-[var(--lab-border)] lg:grid-cols-4">
            <Metric label="200일선 대비" value={fmtPct(met.dist_sma200, 1, { signed: true })} tone={(met.dist_sma200 ?? 0) >= 0 ? "good" : "critical"} />
            <Metric label="20일 모멘텀" value={fmtPct(met.mom20, 2, { signed: true })} tone={(met.mom20 ?? 0) >= 0 ? "good" : "critical"} />
            <Metric label="20일 변동성" value={fmtPct(met.vol20, 1)} sub="연율" />
            <Metric label="RSI 14" value={fmtNum(met.rsi14, 1)} sub={(met.rsi14 ?? 50) < 30 ? "과매도 구간" : (met.rsi14 ?? 50) > 70 ? "과매수 구간" : "중립 구간"} />
          </div>
        </Section>

        <Section className="min-w-0">
          <Bar title="국면 · 위험" right={<span className="lab-label normal-case tracking-[0.06em]">규칙 기반 · 예측 아님</span>} />
          <div className="space-y-4 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={regimeTone(r.regime)} dot>{regimeKo(r.regime)}</Pill>
              {r.regime_since ? (
                <span className="tnum text-[12px] text-[var(--lab-ink-3)]">
                  {r.regime_since}부터 · {r.regime_days ?? 0}일째
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-3 gap-3 text-[12px]">
              <div><dt className="lab-label mb-1">추세 점수</dt><dd className="tnum text-[15px]">{r.trend_score ?? "—"}<span className="text-[var(--lab-ink-3)]">/5</span></dd></div>
              <div><dt className="lab-label mb-1">단기</dt><dd className="text-[14px]">{r.short_term ?? "—"}</dd></div>
              <div><dt className="lab-label mb-1">중기</dt><dd className="text-[14px]">{r.medium_term ?? "—"}</dd></div>
            </dl>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="lab-label">위험 점수</span>
                <span className="flex items-center gap-2">
                  <span className="tnum text-[18px]">{fmtNum(risk.score, 1)}</span>
                  <Pill tone={riskTone(risk.level)}>{risk.level_ko ?? "—"}</Pill>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lab-grid)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--lab-ink-2)]" style={{ width: `${Math.min(100, Math.max(0, risk.score ?? 0))}%` }} />
              </div>
              <ul className="mt-3 space-y-1.5">
                {Object.entries(risk.components ?? {}).map(([k, v]) => (
                  <li key={k} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-[12px]">
                    <span className="text-[var(--lab-ink-2)]">{RISK_KO[k] ?? k}</span>
                    <span className="h-1 overflow-hidden rounded-full bg-[var(--lab-grid)]">
                      {v === null ? null : <span className="block h-full bg-[var(--lab-ink-3)]" style={{ width: `${v * 100}%` }} />}
                    </span>
                    <span className="tnum text-right text-[var(--lab-ink-3)]">{v === null ? "없음" : fmtNum(v * 100, 0)}</span>
                  </li>
                ))}
              </ul>
              {risk.components_missing?.length ? (
                <p className="mt-2 text-[11px] text-[var(--lab-ink-3)]">
                  {risk.components_available} 요소로 계산 · VIX·신용은 FRED 약관상 웹에 올리지 않음
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Factors title="상승 요인" items={r.bullish_factors} tone="good" />
              <Factors title="하락 요인" items={r.bearish_factors} tone="critical" />
            </div>
          </div>
        </Section>
      </div>
    </Frame>
  );
}

function Factors({ title, items, tone }: { title: string; items?: string[]; tone: "good" | "critical" }) {
  return (
    <div>
      <div className="lab-label mb-1.5">{title}</div>
      {items?.length ? (
        <ul className="space-y-1">
          {items.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-snug text-[var(--lab-ink-2)]">
              <span aria-hidden className={tone === "good" ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]"}>
                {tone === "good" ? "↗" : "↘"}
              </span>
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[var(--lab-ink-3)]">해당 없음</p>
      )}
    </div>
  );
}

/* ── Forecast ─────────────────────────────────────────────────────────────── */

const PROB = [
  { key: "bearish_probability", label: "하락", fill: "bg-[var(--lab-critical)]" },
  { key: "neutral_probability", label: "횡보", fill: "bg-[var(--lab-border-strong)]" },
  { key: "bullish_probability", label: "상승", fill: "bg-[var(--lab-good)]" },
] as const;

function ProbBar({ f }: { f: ForecastEntry }) {
  const muted = f.status !== "validated";
  return (
    <div>
      <div className={cx("flex h-2 overflow-hidden rounded-full", muted && "opacity-45")} aria-hidden>
        {PROB.map((p) => <span key={p.key} className={p.fill} style={{ width: `${(f[p.key] ?? 0) * 100}%` }} />)}
      </div>
      <dl className="mt-2 grid grid-cols-3 text-[12px]">
        {PROB.map((p) => (
          <div key={p.key} className={p.key === "neutral_probability" ? "text-center" : p.key === "bullish_probability" ? "text-right" : ""}>
            <dt className="lab-label">{p.label}</dt>
            <dd className="tnum text-[16px]">{fmtPct(f[p.key], 0, { ratio: true })}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ForecastPanel({ core, market }: { core: Core; market: MarketKey }) {
  const per = core.forecast?.markets?.[market] ?? {};
  const history = core.forecast?.history ?? [];
  return (
    <Frame>
      <Bar title="방향 확률 · 1 / 5 / 20거래일" right={<span className="lab-label normal-case tracking-[0.06em]">검증 통과 전에는 흐리게 표시</span>} />
      <div className="grid md:grid-cols-3">
        {HORIZONS.map((h: Horizon, i) => {
          const f = per[h];
          const v = validationLabel(f?.status);
          const rec = liveRecord(history, market, h);
          return (
            <div key={h} className={cx("min-w-0 px-4 py-4", i < 2 && "border-b border-[var(--lab-border)] md:border-b-0 md:border-r")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="tnum text-[15px]">{h}거래일</span>
                <Pill tone={v.tone}>{v.text}</Pill>
              </div>
              {f && f.bullish_probability !== undefined ? (
                <>
                  <ProbBar f={f} />
                  <p className="mt-3 text-[11px] leading-relaxed text-[var(--lab-ink-3)]">
                    <span className="lab-mono">{f.model_name}</span> · 입력 {f.input_cutoff} → 판정 {f.expected_outcome_date ?? "—"}
                    {f.threshold ? <> · 횡보 대역 ±{fmtPct(f.threshold, 2, { ratio: true })}</> : null}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--lab-ink-3)]">
                    실시간 {rec.evaluated}건 중 {rec.hits}건 적중
                    {rec.late ? ` · 늦은 기록 ${rec.late}건 제외` : ""} · 대기 {rec.pending}건
                    {rec.evaluated < 30 ? " · 30건 전에는 판단 불가" : ""}
                  </p>
                </>
              ) : (
                <p className="lab-prose text-[var(--lab-ink-3)]">{f?.reason ?? "예측 없음"}</p>
              )}
            </div>
          );
        })}
      </div>
      <RecentCalls history={history.filter((r) => r.market === market).slice(0, 6)} />
    </Frame>
  );
}

function RecentCalls({ history }: { history: NonNullable<Core["forecast"]>["history"] & object }) {
  if (!history.length) return null;
  return (
    <div className="lab-scroll overflow-x-auto border-t border-[var(--lab-border)]">
      <table className="w-full min-w-[560px] text-[12px]">
        <caption className="sr-only">최근 실시간 예측</caption>
        <thead className="glass-inset">
          <tr className="text-left">
            {["입력일", "기간", "모델", "예측", "결과", "수익률"].map((h) => (
              <th key={h} scope="col" className="lab-label px-4 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((r) => (
            <tr key={r.id} className="row-hover border-t border-[var(--lab-border)]">
              <td className="tnum whitespace-nowrap px-4 py-2">{r.input_cutoff}</td>
              <td className="tnum px-4 py-2">{r.horizon}D</td>
              <td className="px-4 py-2 text-[var(--lab-ink-2)]">{r.model_name}</td>
              <td className="px-4 py-2">{classKo(r.predicted_class)}</td>
              <td className="px-4 py-2">
                {r.status === "evaluated" ? (
                  <Pill tone={r.late ? "neutral" : r.hit ? "good" : "critical"}>
                    {classKo(r.actual_class)} · {r.late ? "늦은 기록" : r.hit ? "적중" : "빗나감"}
                  </Pill>
                ) : (
                  <span className="whitespace-nowrap text-[var(--lab-ink-3)]">대기 ({r.expected_outcome_date})</span>
                )}
              </td>
              <td className="tnum px-4 py-2 text-right">{fmtPct(r.actual_return, 2, { ratio: true, signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Briefing + events + macro ────────────────────────────────────────────── */

export function BriefingPanel({ briefing }: { briefing?: Briefing | null }) {
  const s = briefing?.sections ?? {};
  const ai = (briefing?.method ?? "").includes("llm");
  return (
    <Frame>
      <Bar
        title={`브리핑 · ${briefing?.session === "morning" ? "아침" : "저녁"}`}
        right={<span className="lab-label normal-case tracking-[0.06em]">{ai ? "AI 요약 · 수치 검증 통과" : "규칙 기반"}</span>}
      />
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 border-b border-[var(--lab-border)] px-4 py-4 lg:border-b-0 lg:border-r">
          {s.executive_summary ? (
            <p className="max-w-[72ch] text-[15px] leading-[1.75] text-[var(--lab-ink-1)]">{s.executive_summary}</p>
          ) : (
            <p className="lab-prose text-[var(--lab-ink-3)]">브리핑 없음</p>
          )}
          {s.outlook_changes?.length ? <OutlookChanges items={s.outlook_changes} /> : null}
          {briefing?.input_warnings?.length ? (
            <p className="text-[12px] text-[var(--lab-warning)]">입력 경고: {briefing.input_warnings.join(" · ")}</p>
          ) : null}
        </div>
        <div className="min-w-0 px-4 py-4">
          <div className="lab-label mb-2">다가오는 일정</div>
          {s.events_to_watch?.length ? (
            <ol className="space-y-2.5">
              {s.events_to_watch.map((e) => (
                <li key={`${e.date}${e.title}`} className="grid grid-cols-[5.5rem_1fr] gap-2 text-[13px]">
                  <span className="tnum text-[var(--lab-ink-3)]">{e.date}</span>
                  <span>
                    {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="link-underline">{e.title}</a> : e.title}
                    {e.source ? <span className="block text-[11px] text-[var(--lab-ink-3)]">{e.source}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12px] text-[var(--lab-ink-3)]">45일 안의 확인된 일정 없음</p>
          )}
          <p className="mt-4 border-t border-[var(--lab-border)] pt-3 text-[11px] text-[var(--lab-ink-3)] [overflow-wrap:anywhere]">
            {briefing?.method ?? "—"} · LLM {briefing?.llm_status ?? "—"}
          </p>
        </div>
      </div>
    </Frame>
  );
}

/**
 * The engine writes each change as a line and its explaining inputs as following
 * lines that start with "·". Headlines first; the inputs fold away so the
 * summary above stays the first thing read.
 */
function OutlookChanges({ items }: { items: string[] }) {
  const heads = items.filter((t) => !t.trimStart().startsWith("·"));
  const details = items.length - heads.length;
  const shown = heads.slice(0, 6);
  return (
    <div>
      <div className="lab-label mb-1.5">전일 대비 바뀐 것 · {heads.length}건</div>
      <ul className="space-y-1 text-[13px] text-[var(--lab-ink-2)]">
        {shown.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="text-[var(--lab-ink-3)]">–</span>{t}</li>)}
      </ul>
      {heads.length > shown.length || details ? (
        <details className="mt-2 text-[12px] text-[var(--lab-ink-3)]">
          <summary className="cursor-pointer select-none hover:text-[var(--lab-ink-1)]">
            전체 보기{heads.length > shown.length ? ` · ${heads.length - shown.length}건 더` : ""}{details ? ` · 변화 요인 ${details}줄` : ""}
          </summary>
          <ul className="mt-2 space-y-1">
            {items.map((t, i) => (
              <li key={`${i}${t}`} className={t.trimStart().startsWith("·") ? "pl-4" : "text-[var(--lab-ink-2)]"}>
                {t.replace(/^[\s·]+/, "")}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

const MACRO_KEYS = ["UST10Y", "UST2Y", "CURVE_2S10S", "USDKRW"] as const;

/** Units as the engine writes them: `%` (rates, change in percentage points), `%p` (spread), `KRW` (won per dollar). */
function macroValue(v: number | null | undefined, unit?: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "KRW") return `${fmtNum(v, 1)}원`;
  return `${fmtNum(v, 2)}${unit === "%" ? "%" : unit === "%p" ? "%p" : ""}`;
}

function macroChange(chg: number | null | undefined, unit?: string): string {
  if (chg === null || chg === undefined) return "";
  const sign = chg > 0 ? "+" : "";
  if (unit === "%") return `20일 ${sign}${fmtNum(chg * 100, 0)}bp · `;
  if (unit === "KRW") return `20일 ${sign}${fmtNum(chg, 1)}원 · `;
  return `20일 ${sign}${fmtNum(chg, 2)} · `;
}

export function MacroPanel({ core }: { core: Core }) {
  const macro = core.macro ?? {};
  const ref = core.reference_macro?.indicators ?? {};
  const kr: [string, ReferenceIndicator | undefined][] = [["bok_rate", ref.bok_rate], ["kr3y", ref.kr3y]];
  return (
    <Frame>
      <Bar title="거시 · 금리 · 환율" right={<span className="lab-label normal-case tracking-[0.06em]">Fed H.15 · H.10 · 한국은행 ECOS</span>} />
      <div className="lab-stats grid grid-cols-2 lg:grid-cols-6">
        {MACRO_KEYS.map((k) => {
          const s = macro[k];
          return (
            <Metric
              key={k}
              label={s?.name ?? k}
              value={macroValue(s?.value, s?.unit)}
              sub={s ? `${macroChange(s.chg20, s.unit)}${s.as_of}` : "없음"}
            />
          );
        })}
        {kr.map(([k, s]) => (
          <Metric
            key={k}
            label={s?.name ?? k}
            value={s?.value === undefined || s?.value === null ? "—" : `${fmtNum(s.value, 2)}%`}
            sub={s ? (s.status === "ok" ? `${s.observation_date ?? ""} · ECOS` : s.error ?? s.status) : "ECOS 미연결"}
          />
        ))}
      </div>
    </Frame>
  );
}
