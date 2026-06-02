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
            Live status of every trading bot. Equity, PnL, holdings, and a
            90-day curve per bot, synced from the NAS every 10 min.
          </p>
        </div>
        <FleetDashboard />
      </div>
    </main>
  );
}
