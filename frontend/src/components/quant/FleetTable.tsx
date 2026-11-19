import Link from "next/link";

import { EquitySparkline } from "@/components/quant/EquitySparkline";
import { Pill, RelativeTime, cx } from "@/components/quant/Panel";
import {
  fmtAmount, fmtPct, fmtRelative, lastCycle, parseBotName, parseEquityCurve,
  staleness, type FleetBot, type FleetSortKey, type SortDir,
} from "@/lib/quant";

type Column = { label: string; align?: "left" | "right"; sort?: FleetSortKey };

const COLUMNS: Column[] = [
  { label: "bot", sort: "bot_name" },
  { label: "venue" },
  { label: "state" },
  { label: "equity", align: "right", sort: "equity" },
  { label: "pnl", align: "right", sort: "pnl_pct" },
  { label: "day", align: "right", sort: "day_pnl_pct" },
  { label: "pos", align: "right" },
  { label: "hold", align: "right" },
  { label: "fills", align: "right" },
  { label: "trend" },
  { label: "last cycle", align: "right", sort: "updated_at" },
];

/** Green for a gain, red for a loss; nothing at all for "no number". */
function pnlTone(n: number | null | undefined): string | undefined {
  if (n === null || n === undefined) return undefined;
  return n >= 0 ? "text-[var(--lab-good)]" : "text-[var(--lab-critical)]";
}

export function FleetTable({
  bots, colors, now, sortKey, sortDir, onSort,
}: {
  /** Already sorted. */
  bots: FleetBot[];
  colors: Map<string, string>;
  now: number;
  sortKey: FleetSortKey;
  sortDir: SortDir;
  onSort: (key: FleetSortKey) => void;
}) {
  return (
    <div className="lab-scroll overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="glass-inset border-b border-[var(--lab-border)]">
            {COLUMNS.map((c) => (
              <Th
                key={c.label}
                align={c.align}
                onClick={c.sort ? () => onSort(c.sort!) : undefined}
                active={c.sort !== undefined && sortKey === c.sort}
                dir={sortDir}
              >
                {c.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bots.map((b) => (
            <FleetRow key={b.id} bot={b} color={colors.get(b.id)} now={now} />
          ))}
          {bots.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="lab-prose px-3 py-8 text-center text-[var(--lab-ink-3)]">
                No bots have synced yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FleetRow({ bot: b, color, now }: { bot: FleetBot; color: string | undefined; now: number }) {
  const bot = parseBotName(b.bot_name);
  const points = parseEquityCurve(b.equity_curve);
  const cycled = lastCycle(points, b.updated_at);
  const age = staleness(cycled, now);
  const day = b.day_pnl_pct;
  const noDay = day === null || day === undefined;

  return (
    <tr className="row-hover border-b border-[var(--lab-border)] transition-colors last:border-0">
      <td className="relative py-2 pl-4 pr-3">
        {/* Leading stripe carries series identity, tying the row to its line
            above. Condition is the STATE pill, in words — two colour marks per
            row was just noise. */}
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: color ?? "var(--lab-border-strong)" }}
          aria-hidden
        />
        <Link href={`/lab/bot/${encodeURIComponent(b.id)}`} className="group flex items-center gap-2">
          <span className="lab-mono shrink-0 font-medium text-[var(--lab-ink-1)] transition-colors group-hover:text-[var(--lab-accent)]">
            {bot.tag}
          </span>
          {/* A legacy bot name can be a whole parameter dump. */}
          <span className="lab-mono min-w-0 truncate text-[11px] text-[var(--lab-ink-3)]" title={bot.strategy}>
            {bot.strategy}
          </span>
        </Link>
      </td>
      <td className="px-3 py-2">
        <Pill tone={bot.venue && bot.real ? "serious" : "neutral"}>{bot.venue ?? "SIM"}</Pill>
      </td>
      <td className="px-3 py-2">
        {bot.halted ? (
          <Pill tone="critical" dot>halted·{bot.haltKind}</Pill>
        ) : age === "live" ? (
          <Pill tone="good" dot>trading</Pill>
        ) : (
          <Pill tone="warning" dot>{age}</Pill>
        )}
      </td>
      <Td right mono>{fmtAmount(b.equity, b.currency, 2)}</Td>
      <Td right mono className={pnlTone(b.pnl_pct ?? 0)}>{fmtPct(b.pnl_pct)}</Td>
      {/* Since the bot's last cycle. Uncoloured when null so a missing
          baseline never reads as a flat day. */}
      <Td
        right
        mono
        muted={noDay}
        className={pnlTone(day)}
        title={noDay ? "no baseline — the bot has not cycled since before yesterday" : "since the previous daily cycle"}
      >
        {fmtPct(day)}
      </Td>
      <Td right mono muted>{b.position_pct !== null ? `${b.position_pct.toFixed(0)}%` : "—"}</Td>
      <Td right mono muted>{b.holdings_count ?? "—"}</Td>
      <Td right mono muted>{b.fills_count ?? "—"}</Td>
      <td className="px-3 py-2">
        <EquitySparkline points={points} positive={(b.pnl_pct ?? 0) >= 0} />
      </td>
      <Td right mono muted>
        <RelativeTime>{fmtRelative(new Date(cycled).toISOString())}</RelativeTime>
      </Td>
    </tr>
  );
}

/**
 * A column header, sortable ones as a real <button>.
 *
 * It used to be an onClick on the <th> itself, which no keyboard could reach
 * and no screen reader announced as actionable. `aria-sort` on the cell is the
 * other half: the arrow glyph is visual-only, so without it the current sort
 * is invisible to anyone not looking at the arrow.
 */
function Th({
  children, onClick, active, dir, align = "left",
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: SortDir;
  align?: "left" | "right";
}) {
  const label = (
    <>
      {children}
      {active ? (dir === "desc" ? " ↓" : " ↑") : ""}
    </>
  );
  return (
    <th
      aria-sort={
        onClick ? (active ? (dir === "desc" ? "descending" : "ascending") : "none") : undefined
      }
      className={cx("px-3 py-2 font-normal", align === "right" ? "text-right" : "text-left")}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cx("lab-label lab-sort select-none", active && "text-[var(--lab-ink-1)]")}
        >
          {label}
        </button>
      ) : (
        <span className="lab-label">{label}</span>
      )}
    </th>
  );
}

function Td({
  children, right, mono, muted, className, title,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  className?: string;
  /** Hover text — used to explain a cell that renders "—" on purpose. */
  title?: string;
}) {
  return (
    <td
      title={title}
      className={cx(
        "px-3 py-2",
        right && "text-right",
        mono && "tnum",
        muted ? "text-[var(--lab-ink-2)]" : "text-[var(--lab-ink-1)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
