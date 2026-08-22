import { FleetDashboard } from "@/components/quant/FleetDashboard";
import "./lab-console.css";

export default function Lab() {
  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 pt-24 pb-14 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        {/* Command bar. Deliberately not the site's serif masthead: the Lab is
            machinery, and dressing it as editorial would misrepresent what it
            is. Everything below is scoped to `.lab-console`. */}
        <header className="glass-inset mb-3 flex h-10 items-center gap-3 border border-[var(--lab-border)] px-3">
          <span className="text-[14px] tracking-[0.18em] text-[var(--lab-ink-1)]">
            QUANT<span className="text-[var(--lab-ink-3)]">/</span>FLEET
          </span>
          <span className="hidden h-3 w-px bg-[var(--lab-border)] sm:block" />
          <span className="lab-label hidden sm:block">operational console</span>
          <span className="lab-label ml-auto">abovemin.com/lab</span>
        </header>

        <FleetDashboard />

        {/* The status of the money is stated in words, under the numbers, so
            nobody has to infer it from a badge. This used to read "paper
            trading only · simulated capital" — true then, and false the moment
            a real account started trading. The per-bot VENUE tag is what
            actually distinguishes them, row by row. */}
        <p className="mt-3 border border-[var(--lab-border)] bg-[var(--lab-surface-1)] px-3 py-2 text-[12px] leading-relaxed text-[var(--lab-ink-2)]">
          Live operational status, synced from the trading host. Each row is
          tagged with the account it trades:{" "}
          <span className="text-[var(--lab-serious)]">TOSS·REAL</span> and{" "}
          <span className="text-[var(--lab-serious)]">KIS</span> are real money;{" "}
          <span className="text-[var(--lab-ink-1)]">KIS-MOCK</span> and{" "}
          <span className="text-[var(--lab-ink-1)]">SIM</span> are simulated
          capital. Real and simulated equity are never totalled together.
          Nothing here is advice, a solicitation, or a claim of future
          performance.
        </p>
      </div>
    </main>
  );
}
