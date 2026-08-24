import { FleetDashboard } from "@/components/quant/FleetDashboard";

export default function Lab() {
  return (
    // Same page frame as every other route: `px-4 sm:px-6 md:px-10` and the
    // site's `py-10 md:py-16` rhythm. It used to sit at `pt-24`, which stacked
    // on top of the layout's own nav offset and left the console floating far
    // below where every other page starts.
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px] space-y-4">
        {/* Command bar. The console is machinery and its structure says so —
            but the wordmark wears the site's ink: forest for the name, moss
            for the divider, the same two colours the nav and the section
            markers use. Everything below is scoped to `.lab-console`. */}
        <header className="glass-inset flex h-11 items-center gap-3 border border-[var(--lab-border)] px-4">
          <span className="lab-mono text-[14px] font-medium tracking-[0.18em] text-[var(--lab-accent)]">
            QUANT<span className="text-[var(--moss)]">/</span>FLEET
          </span>
          <span className="hidden h-3.5 w-px bg-[var(--lab-border)] sm:block" />
          <span className="lab-label hidden sm:block">operational console</span>
          <span className="lab-label ml-auto">abovemin.com/lab</span>
        </header>

        <FleetDashboard />

        {/* The status of the money is stated in words, under the numbers, so
            nobody has to infer it from a badge. This used to read "paper
            trading only · simulated capital" — true then, and false the moment
            a real account started trading. The per-bot VENUE tag is what
            actually distinguishes them, row by row. */}
        <p className="lab-prose rounded-[var(--radius-md)] border border-[var(--lab-border)] bg-[var(--lab-surface-1)] px-4 py-3 text-[var(--lab-ink-2)]">
          Live operational status, synced from the trading host. Each row is
          tagged with the account it trades:{" "}
          <span className="lab-mono text-[var(--lab-serious)]">TOSS·REAL</span> and{" "}
          <span className="lab-mono text-[var(--lab-serious)]">KIS</span> are real money;{" "}
          <span className="lab-mono text-[var(--lab-ink-1)]">KIS-MOCK</span> and{" "}
          <span className="lab-mono text-[var(--lab-ink-1)]">SIM</span> are simulated
          capital. Real and simulated equity are never totalled together.
          Nothing here is advice, a solicitation, or a claim of future
          performance.
        </p>
      </div>
    </main>
  );
}
