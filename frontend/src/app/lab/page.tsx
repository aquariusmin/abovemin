import { FleetDashboard } from "@/components/quant/FleetDashboard";
import Reveal from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export default function Lab() {
  return (
    <main className="min-h-screen bg-surface-dark pt-32 pb-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <Reveal as="header" className="space-y-5" y={16}>
          <p className="eyebrow text-white/60">The Lab</p>
          <h1 className="font-serif text-4xl md:text-6xl font-medium text-white tracking-tight leading-[1.05]">
            Quant Trading Fleet
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-2xl leading-relaxed break-keep">
            Operational status for paper-trading validation. Simulated equity,
            PnL, holdings, and a 90-day curve per bot are synced from the
            validation server.
          </p>
          <p className="inline-flex items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200">
            Paper trading only · simulated capital · no real-money performance
          </p>
        </Reveal>
        <FleetDashboard />
      </div>
    </main>
  );
}
