// Colours via `--lab-*` arbitrary values, so /lab never registers global classes the site could pick up.

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Frame({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("pane", className)} {...props} />;
}

export function Section({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("border-b border-[var(--lab-border)] last:border-b-0", className)}
      {...props}
    />
  );
}

export function Bar({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="bar glass-inset flex h-9 items-center justify-between gap-3 pl-4 pr-3">
      <span className="lab-label">{title}</span>
      {right}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "neutral" | "good" | "critical" | "warning";
}) {
  const color = {
    neutral: "text-[var(--lab-ink-1)]",
    good: "text-[var(--lab-good)]",
    critical: "text-[var(--lab-critical)]",
    warning: "text-[var(--lab-warning)]",
  }[tone];
  return (
    <div className="min-w-0 border-r border-[var(--lab-border)] px-4 py-3.5 last:border-r-0">
      {/* The label wraps instead of truncating (it hid the unit); the fixed height keeps values on one baseline. */}
      <div className="lab-label mb-2 min-h-[2.6em] [overflow-wrap:anywhere]">{label}</div>
      <div className={cx("truncate text-[22px] leading-none tnum", color)}>
        {value}
      </div>
      {sub ? (
        <div className="mt-2 truncate text-[11px] text-[var(--lab-ink-3)]">{sub}</div>
      ) : null}
    </div>
  );
}

type PillTone = "neutral" | "good" | "warning" | "serious" | "critical";

const PILL: Record<PillTone, string> = {
  neutral: "border-[var(--lab-border-strong)] text-[var(--lab-ink-2)]",
  good: "border-[var(--lab-good)]/45 text-[var(--lab-good)] bg-[var(--lab-accent-wash)]",
  warning: "border-[var(--lab-warning)]/45 text-[var(--lab-warning)]",
  serious: "border-[var(--lab-serious)]/45 text-[var(--lab-serious)]",
  critical: "border-[var(--lab-critical)]/55 text-[var(--lab-critical)]",
};

/** Relative time differs by hydration (#418), so `suppressHydrationWarning` sits right on the string. */
export function RelativeTime({ children }: { children: React.ReactNode }) {
  return <span suppressHydrationWarning>{children}</span>;
}

export function FeedStale({
  error,
  since,
}: {
  error: string;
  since?: string | null;
}) {
  return (
    <Section
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-l-[var(--lab-warning)] bg-[color-mix(in_srgb,var(--lab-warning)_6%,transparent)] px-4 py-2.5"
    >
      <Pill tone="warning" dot>feed stale</Pill>
      <span className="lab-prose text-[var(--lab-ink-2)]">
        Last refresh failed ({error}). Showing the last good data
        {since ? <>, fetched <RelativeTime>{since}</RelativeTime></> : null}; retrying.
      </span>
    </Section>
  );
}

/** Status is never colour alone — each pill carries its own text. */
export function Pill({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cx("lab-pill", PILL[tone])}
    >
      {dot ? <span className="h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
