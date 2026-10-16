import Link from "next/link";
import { Pill, cx } from "@/components/quant/Panel";
import { fmtKst, freshness } from "@/lib/markets/view";

const TABS = [
  { href: "/lab/markets", key: "overview", label: "개요" },
  { href: "/lab/markets/news", key: "news", label: "뉴스·공시" },
  { href: "/lab/markets/models", key: "models", label: "모델 검증" },
  { href: "/lab/markets/status", key: "status", label: "운영 상태" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

/**
 * Same frame as /lab: the site's page rhythm, one command bar, then content.
 * The bar says three things before any number: whose page this is (owner
 * only), how fresh the upload is, and where the numbers come from.
 */
export function Shell({
  active,
  generatedAt,
  now,
  notice,
  children,
}: {
  active: TabKey;
  generatedAt?: string | null;
  now: number;
  notice?: string;
  children: React.ReactNode;
}) {
  const fresh = freshness(generatedAt, now);
  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="glass-inset flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border border-[var(--lab-border)] px-4 py-2">
          <h1 className="lab-mono text-[14px] font-medium tracking-[0.18em] text-[var(--lab-accent)]">
            MARKETS<span className="text-[var(--moss)]">/</span>INTEL
          </h1>
          <span className="hidden h-3.5 w-px bg-[var(--lab-border)] sm:block" />
          <Pill tone="neutral">본인 전용</Pill>
          <span className="ml-auto flex items-center gap-2">
            <Pill tone={fresh.tone} dot>
              {fresh.hours === null ? "데이터 없음" : fresh.hours < 1 ? "방금 갱신" : `${Math.floor(fresh.hours)}시간 전`}
            </Pill>
            <span className="tnum hidden text-[11px] text-[var(--lab-ink-3)] sm:inline">{fmtKst(generatedAt)}</span>
          </span>
        </header>

        <nav aria-label="시장 대시보드" className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className={cx(
                "whitespace-nowrap rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-[13px] transition-colors",
                active === t.key
                  ? "border-[var(--lab-accent)] bg-[var(--lab-accent)] text-[var(--primary-foreground)]"
                  : "border-[var(--lab-border)] text-[var(--lab-ink-2)] hover:bg-[var(--lab-accent-wash)] hover:text-[var(--lab-ink-1)]",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {children}

        <p className="lab-prose rounded-[var(--radius-md)] border border-[var(--lab-border)] bg-[var(--lab-surface-1)] px-4 py-3 text-[var(--lab-ink-2)]">
          {notice ?? "본인 전용 · 재배포 금지."} 국면은 현재 상태의 규칙 기반 서술이고, 방향 확률은 사전에 고정한
          시간순 검증을 통과한 경우에만 의미가 있습니다. 비용을 반영하면 어떤 모델도 단순 보유를 이기지 못했습니다 —
          투자 권유나 성과 보장이 아닙니다.
        </p>
      </div>
    </main>
  );
}

/** An honest empty state: what is missing and why, never a placeholder number. */
export function Missing({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="pane px-4 py-10 text-center">
      <div className="lab-label mb-2">{title}</div>
      <p className="lab-prose text-[var(--lab-ink-2)]">{reason}</p>
    </div>
  );
}
