import { FleetDashboard } from "@/components/quant/FleetDashboard";
import { supabase } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { FleetBot } from "@/lib/quant";

export const revalidate = 60;

// select('*'): 동기화 컨테이너가 스키마를 소유해 컬럼이 늦게 온다. readAt은 하이드레이션 불일치를 막는다.
async function getFleet(): Promise<{ bots: FleetBot[] | null; readAt: number }> {
  const { data, error } = await supabase
    .from("quant_fleet")
    .select("*")
    .order("equity", { ascending: false });
  const readAt = Date.now();
  if (error) {
    log.warn("lab.fleet_ssr", error);
    return { bots: null, readAt };
  }
  return { bots: (data ?? []) as FleetBot[], readAt };
}

export default async function Lab() {
  const { bots: initialBots, readAt } = await getFleet();

  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="glass-inset flex h-11 items-center gap-3 border border-[var(--lab-border)] px-4">
          <h1 className="lab-mono text-[14px] font-medium tracking-[0.18em] text-[var(--lab-accent)]">
            QUANT<span className="text-[var(--moss)]">/</span>FLEET
          </h1>
          <span className="hidden h-3.5 w-px bg-[var(--lab-border)] sm:block" />
          <span className="lab-label hidden sm:block">operational console</span>
          <span className="lab-label ml-auto">abovemin.com/lab</span>
        </header>

        <FleetDashboard initialBots={initialBots} renderedAt={readAt} />

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
