/**
 * Console primitives, scoped to /lab.
 *
 * Colours come from `--lab-*` custom properties in `lab-console.css` via
 * arbitrary values rather than Tailwind theme utilities, so this second design
 * language never registers global `bg-surface-1`-style classes that the rest of
 * the site could pick up by accident.
 */
/** Local join — not worth a dependency for this. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The console is ONE grid, not a deck of cards: a single outer hairline, and
 * sections inside separated by shared rules. Cards-with-gaps is the web-page
 * idiom; a continuous ruled grid is the equipment idiom.
 */
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
    <div className="bar glass-inset flex h-7 items-center justify-between gap-3 pl-3 pr-2">
      <span className="lab-label">{title}</span>
      {right}
    </div>
  );
}

/**
 * A metric cell. Cells butt against each other divided by hairlines, not four
 * separate cards. Deliberately not a chart: when the story is one number, the
 * number IS the visualisation.
 */
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
    <div className="min-w-0 border-r border-[var(--lab-border)] px-3 py-2 last:border-r-0">
      <div className="lab-label mb-1.5 truncate">{label}</div>
      <div className={cx("truncate text-[20px] leading-none tnum", color)}>
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 truncate text-[11px] text-[var(--lab-ink-3)]">{sub}</div>
      ) : null}
    </div>
  );
}

type PillTone = "neutral" | "good" | "warning" | "serious" | "critical";

const PILL: Record<PillTone, string> = {
  neutral: "border-[var(--lab-border-strong)] text-[var(--lab-ink-2)]",
  good: "border-[var(--lab-good)]/45 text-[var(--lab-good)]",
  warning: "border-[var(--lab-warning)]/45 text-[var(--lab-warning)]",
  serious: "border-[var(--lab-serious)]/45 text-[var(--lab-serious)]",
  critical: "border-[var(--lab-critical)]/55 text-[var(--lab-critical)]",
};

/** Status is never colour alone — each pill carries its own text, so the state
 *  survives colour-blindness, greyscale and a screenshot. */
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
      className={cx(
        "inline-flex items-center gap-1.5 border px-1.5 py-[1px] text-[11px] uppercase tracking-[0.1em] whitespace-nowrap",
        PILL[tone],
      )}
    >
      {dot ? <span className="h-1 w-1 shrink-0 bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
