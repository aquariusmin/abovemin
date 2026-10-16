import Link from "next/link";
import { Bar, Frame, Pill, cx } from "@/components/quant/Panel";
import type { EconomicsVariant, Horizon, MarketKey, News, Performance, Status } from "@/lib/markets/types";
import { HORIZONS } from "@/lib/markets/types";
import { MARKET_ORDER, fmtKst, fmtNum, fmtPct, validationLabel, type Tone } from "@/lib/markets/view";

const MARKET_NAME: Record<MarketKey, string> = { sp: "S&P 500", nq: "NASDAQ 100", ks: "KOSPI", kq: "KOSDAQ" };

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th scope="col" className={cx("lab-label whitespace-nowrap px-4 py-2 font-medium", right ? "text-right" : "text-left")}>{children}</th>;
}

/* ── News ─────────────────────────────────────────────────────────────────── */

const SENT: Record<string, { text: string; tone: Tone }> = {
  positive: { text: "긍정", tone: "good" }, neutral: { text: "중립", tone: "neutral" }, negative: { text: "부정", tone: "critical" },
};

export function NewsTable({ news }: { news: News }) {
  const items = (news.items ?? []).slice(0, 80);
  const report = news.report ?? {};
  const sources = Object.entries(report).filter(([, v]) => typeof v === "object") as [string, { status?: string; error?: string | null }][];
  return (
    <Frame>
      <Bar title={`공식 발표·뉴스 · 최근 14일 ${items.length}건`} right={<span className="lab-label normal-case tracking-[0.06em]">제목·링크만 저장 · 예측에 쓰지 않음</span>} />
      <div className="flex flex-wrap gap-2 border-b border-[var(--lab-border)] px-4 py-2.5">
        {sources.map(([k, v]) => (
          <Pill key={k} tone={v.status === "ok" ? "good" : v.status === "partial" ? "warning" : v.status === "failed" ? "critical" : "neutral"}>
            {k.replace(/_/g, " ")} · {v.status ?? "—"}
          </Pill>
        ))}
      </div>
      <ul>
        {items.map((n) => (
          <li key={n.id} className="row-hover grid gap-1 border-b border-[var(--lab-border)] px-4 py-3 last:border-b-0 md:grid-cols-[8.5rem_minmax(0,1fr)_auto] md:gap-4">
            <span className="tnum text-[12px] text-[var(--lab-ink-3)]">{fmtKst(n.published_at ?? n.collected_at)}</span>
            <span className="min-w-0">
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="link-underline text-[14px] leading-snug">{n.title}</a>
              <span className="mt-0.5 block text-[11px] text-[var(--lab-ink-3)]">
                {n.source} · {n.category ?? "Other"} · 중요도 {n.importance ?? "—"}/5
              </span>
            </span>
            <span className="flex items-start gap-1.5">
              {n.sentiment_label && SENT[n.sentiment_label] ? <Pill tone={SENT[n.sentiment_label].tone}>{SENT[n.sentiment_label].text}</Pill> : <Pill>감성 없음</Pill>}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-[var(--lab-border)] px-4 py-2.5 text-[11px] text-[var(--lab-ink-3)]">{news.sentiment_note}</p>
    </Frame>
  );
}

export function DisclosuresTable({ news }: { news: News }) {
  const d = news.disclosures;
  if (!d) return null;
  const items = d.items ?? [];
  return (
    <Frame>
      <Bar title={`DART 주요사항보고서 · ${items.length}건`} right={<span className="lab-label normal-case tracking-[0.06em]">{d.scope}</span>} />
      {d.error ? <p className="border-b border-[var(--lab-border)] px-4 py-2.5 text-[12px] text-[var(--lab-warning)]">{d.error}</p> : null}
      {d.truncated?.length ? <p className="border-b border-[var(--lab-border)] px-4 py-2.5 text-[12px] text-[var(--lab-warning)]">일부만 표시: {d.truncated.join(" · ")}</p> : null}
      <div className="lab-scroll max-h-[560px] overflow-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <caption className="sr-only">DART 공시 목록</caption>
          <thead className="glass-inset sticky top-0">
            <tr><Th>접수일</Th><Th>시장</Th><Th>회사</Th><Th>유형</Th><Th>보고서</Th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.url} className="row-hover border-t border-[var(--lab-border)]">
                <td className="tnum whitespace-nowrap px-4 py-2">{i.date}</td>
                <td className="px-4 py-2">{i.market === "ks" ? "KOSPI" : "KOSDAQ"}</td>
                <td className="whitespace-nowrap px-4 py-2" style={{ fontFamily: "var(--font-body-stack)" }}>{i.company}</td>
                <td className="whitespace-nowrap px-4 py-2" style={{ fontFamily: "var(--font-body-stack)" }}>
                  {i.kind}{i.amended ? <span className="ml-1.5 text-[var(--lab-ink-3)]">정정</span> : null}
                </td>
                <td className="px-4 py-2" style={{ fontFamily: "var(--font-body-stack)" }}>
                  <a href={i.url} target="_blank" rel="noopener noreferrer" className="link-underline">{i.report}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--lab-border)] px-4 py-2.5 text-[11px] text-[var(--lab-ink-3)]">
        출처 OpenDART(금융감독원) · 회사별 공시이며 지수 전망에 쓰지 않습니다 · 저장하지 않고 매 실행 교체
      </p>
    </Frame>
  );
}

/* ── Models ───────────────────────────────────────────────────────────────── */

const ECON: { key: "same_close" | "next_open" | "next_close"; label: string }[] = [
  { key: "same_close", label: "당일 종가 진입" },
  { key: "next_open", label: "다음 날 시가 → 시가" },
  { key: "next_close", label: "하루 늦은 종가" },
];

function verdictTone(v?: string): Tone {
  if (v === "비용 차감 후 우위") return "good";
  if (v?.startsWith("우위 근거 부족")) return "warning";
  return "critical";
}

export function ModelsMatrix({ perf, active }: { perf: Performance; active: MarketKey }) {
  return (
    <Frame>
      <Bar title="검증 게이트 · 12개 조합" right={<span className="lab-label normal-case tracking-[0.06em]">2026-10-15 사전 고정 기준 · holdout</span>} />
      <div className="lab-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <caption className="sr-only">시장과 기간별 검증 결과</caption>
          <thead className="glass-inset">
            <tr><Th>시장</Th>{HORIZONS.map((h) => <Th key={h}>{h}거래일</Th>)}</tr>
          </thead>
          <tbody>
            {MARKET_ORDER.map((m) => (
              <tr key={m} className={cx("border-t border-[var(--lab-border)]", m === active && "bg-[var(--lab-accent-wash)]")}>
                <td className="px-4 py-2.5">
                  <Link href={`/lab/markets/models?m=${m}`} className="link-underline" style={{ fontFamily: "var(--font-body-stack)" }}>{MARKET_NAME[m]}</Link>
                </td>
                {HORIZONS.map((h) => {
                  const e = perf.markets?.[m]?.[h];
                  const pm = e?.primary_model;
                  const st = pm ? e?.models?.[pm]?.validation?.status : undefined;
                  const v = validationLabel(st);
                  return (
                    <td key={h} className="px-4 py-2.5">
                      {e?.status === "ok" ? (
                        <span className="flex flex-wrap items-center gap-2"><Pill tone={v.tone}>{v.text}</Pill><span className="text-[var(--lab-ink-3)]">{pm}</span></span>
                      ) : (
                        <span className="text-[var(--lab-ink-3)]">{e?.reason ?? e?.status ?? "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

export function ModelDetail({ perf, market }: { perf: Performance; market: MarketKey }) {
  return (
    <div className="space-y-4">
      {HORIZONS.map((h: Horizon) => {
        const e = perf.markets?.[market]?.[h];
        if (!e || e.status !== "ok") return null;
        const pm = e.primary_model ?? "";
        const m = e.models?.[pm];
        const base = e.models?.class_frequency;
        const v = validationLabel(m?.validation?.status);
        return (
          <Frame key={h}>
            <Bar title={`${MARKET_NAME[market]} · ${h}거래일 · ${pm}`} right={<Pill tone={v.tone}>{v.text}</Pill>} />
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="min-w-0 border-b border-[var(--lab-border)] px-4 py-4 lg:border-b-0 lg:border-r">
                <p className="mb-3 text-[11px] text-[var(--lab-ink-3)]">
                  개발 {e.spans?.development?.join(" ~ ")} → holdout {e.spans?.holdout?.join(" ~ ")}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
                  <Stat k="정확도" v={fmtPct(m?.accuracy, 1, { ratio: true })} b={fmtPct(base?.accuracy, 1, { ratio: true })} />
                  <Stat k="균형 정확도" v={fmtPct(m?.balanced_accuracy, 1, { ratio: true })} b={fmtPct(base?.balanced_accuracy, 1, { ratio: true })} />
                  <Stat k="Log loss ↓" v={fmtNum(m?.log_loss, 3)} b={fmtNum(base?.log_loss, 3)} />
                  <Stat k="ECE ↓" v={fmtNum(m?.ece, 3)} />
                  <Stat k="LL 개선 90% 하한" v={fmtNum(m?.vs_class_frequency?.ci90_low, 4)} />
                  <Stat k="유효 표본" v={String(m?.effective_n ?? "—")} />
                </dl>
                {m?.validation?.reasons?.length ? (
                  <ul className="mt-3 space-y-1 text-[12px] text-[var(--lab-ink-2)]">
                    {m.validation.reasons.map((r) => <li key={r}>· {r}</li>)}
                  </ul>
                ) : null}
              </div>
              <div className="lab-scroll min-w-0 overflow-x-auto">
                <table className="w-full min-w-[560px] text-[12px]">
                  <caption className="sr-only">비용 반영 성과</caption>
                  <thead className="glass-inset">
                    <tr><Th>진입</Th><Th right>전략</Th><Th right>단순 보유</Th><Th right>기간당 초과 [90%]</Th><Th>판정</Th></tr>
                  </thead>
                  <tbody>
                    {ECON.map(({ key, label }) => <EconRow key={key} label={label} r={e.economics?.[key]} />)}
                  </tbody>
                </table>
                <p className="border-t border-[var(--lab-border)] px-4 py-2.5 text-[11px] leading-relaxed text-[var(--lab-ink-3)]">
                  상승을 가장 높게 볼 때만 보유, 아니면 현금 · 겹치지 않는 기간 · 왕복 비용 한국 0.10%, 미국 ETF 0.25% · 배당·세금·환전 미반영
                </p>
              </div>
            </div>
          </Frame>
        );
      })}
    </div>
  );
}

function Stat({ k, v, b }: { k: string; v: string; b?: string }) {
  return (
    <div>
      <dt className="lab-label mb-1">{k}</dt>
      <dd className="tnum text-[16px]">{v}{b ? <span className="ml-1.5 text-[11px] text-[var(--lab-ink-3)]">기준 {b}</span> : null}</dd>
    </div>
  );
}

function EconRow({ label, r }: { label: string; r?: EconomicsVariant }) {
  if (!r || r.status !== "ok") {
    return (
      <tr className="border-t border-[var(--lab-border)]">
        <td className="whitespace-nowrap px-4 py-2" style={{ fontFamily: "var(--font-body-stack)" }}>{label}</td>
        <td colSpan={4} className="px-4 py-2 text-[var(--lab-ink-3)]" style={{ fontFamily: "var(--font-body-stack)" }}>{r?.reason ?? "계산 불가"}</td>
      </tr>
    );
  }
  const ci = r.excess_ci90 ?? [Number.NaN, Number.NaN];
  return (
    <tr className="border-t border-[var(--lab-border)]">
      <td className="whitespace-nowrap px-4 py-2" style={{ fontFamily: "var(--font-body-stack)" }}>{label}</td>
      <td className={cx("tnum px-4 py-2 text-right", (r.strategy_total ?? 0) >= 0 ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]")}>{fmtPct(r.strategy_total, 0, { ratio: true, signed: true })}</td>
      <td className="tnum px-4 py-2 text-right">{fmtPct(r.buy_hold_total, 0, { ratio: true, signed: true })}</td>
      <td className="tnum whitespace-nowrap px-4 py-2 text-right">
        {fmtPct(r.mean_excess_vs_hold, 2, { ratio: true, signed: true })} <span className="text-[var(--lab-ink-3)]">[{fmtNum((ci[0] ?? 0) * 100, 2)}, {fmtNum((ci[1] ?? 0) * 100, 2)}]</span>
      </td>
      <td className="px-4 py-2"><Pill tone={verdictTone(r.verdict)}>{r.verdict ?? "—"}</Pill></td>
    </tr>
  );
}

/* ── Status ───────────────────────────────────────────────────────────────── */

export function JobsTable({ status }: { status: Status }) {
  const jobs = (status.jobs ?? []).slice(0, 30);
  return (
    <Frame>
      <Bar title="작업 이력 · 최근 30건" right={<span className="lab-label normal-case tracking-[0.06em]">PC cron 08:30 · 16:30 · 일 10:00 · 부팅 후 재실행</span>} />
      <div className="lab-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px]">
          <caption className="sr-only">작업 이력</caption>
          <thead className="glass-inset"><tr><Th>시작</Th><Th>작업</Th><Th>상태</Th><Th>메시지</Th></tr></thead>
          <tbody>
            {jobs.map((j, i) => (
              <tr key={`${j.started_at}${j.job}${i}`} className="row-hover border-t border-[var(--lab-border)] align-top">
                <td className="tnum whitespace-nowrap px-4 py-2">{fmtKst(j.started_at)}</td>
                <td className="px-4 py-2">{j.job}</td>
                <td className="px-4 py-2">
                  <Pill tone={j.status === "ok" ? "good" : j.status === "failed" ? "critical" : j.status === "partial" ? "warning" : "neutral"}>{j.status}</Pill>
                </td>
                <td className="px-4 py-2 text-[var(--lab-ink-2)] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-body-stack)" }}>{j.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--lab-border)] px-4 py-2.5 text-[11px] text-[var(--lab-ink-3)]">
        엔진 {status.engine_version ?? "—"} · SQLite 무결성 {status.storage?.integrity ?? "—"} · 스키마 v{status.storage?.schema_version ?? "—"}
      </p>
    </Frame>
  );
}

