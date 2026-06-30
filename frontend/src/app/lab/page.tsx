import { FleetDashboard } from "@/components/quant/FleetDashboard";

export const dynamic = "force-dynamic";

export default function Lab() {
  return (
    <main className="min-h-screen bg-[#1a1c1a] pt-32 pb-16 px-6 md:px-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
            ── The Lab
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Quant Trading Fleet
          </h1>
          <p className="text-[11px] font-mono text-white/40 max-w-2xl leading-relaxed">
            Operational status for paper-trading validation. Simulated equity,
            PnL, holdings, and a 90-day curve per bot are synced from the validation server.
          </p>
          <div className="inline-flex items-center gap-2 border border-amber-300/20 bg-amber-300/5 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-200">
            Paper trading only · simulated capital · no real-money performance
          </div>
        </div>
        <FleetDashboard />
      </div>
    </main>
  );
}
