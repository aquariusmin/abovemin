"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexData {
  symbol: string;
  name: string;
  region: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  error?: boolean;
}

interface SectorData {
  symbol: string;
  name: string;
  changePercent: number;
  error?: boolean;
}

interface KrStockData {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number;
  change: number | null;
  error?: boolean;
}

interface ChartPoint {
  date: string;
  close: number | null;
}

const CHART_SYMBOLS = [
  { symbol: '^GSPC',  label: 'S&P 500' },
  { symbol: '^IXIC',  label: 'NASDAQ' },
  { symbol: '^KS11',  label: 'KOSPI' },
  { symbol: '^KQ11',  label: 'KOSDAQ' },
];

const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const;
type Range = typeof RANGES[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

function IndexCard({ data }: { data: IndexData }) {
  const up = (data.changePercent ?? 0) >= 0;
  const isVix = data.symbol === '^VIX';

  return (
    <div className="border border-white/8 bg-white/3 p-5 space-y-3 hover:bg-white/6 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/30">{data.region}</p>
          <p className="text-[13px] font-bold text-white/80 mt-1">{data.name}</p>
        </div>
        {!data.error && (
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm font-bold ${
            isVix ? 'text-yellow-400 bg-yellow-400/10' :
            up ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
          }`}>
            {isVix ? 'FEAR' : up ? '▲' : '▼'}
          </span>
        )}
      </div>
      {data.error ? (
        <p className="text-[11px] text-white/20 font-mono">— unavailable —</p>
      ) : (
        <>
          <p className="text-2xl font-black tracking-tight text-white">
            {data.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className={`text-[12px] font-mono font-bold ${
            isVix ? 'text-yellow-400' : up ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {up && !isVix ? '+' : ''}{data.changePercent?.toFixed(2)}%
            <span className="text-white/30 font-normal ml-2">
              ({up && !isVix ? '+' : ''}{data.change?.toFixed(2)})
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function SectorHeatmap({ sectors }: { sectors: SectorData[] }) {
  const max = Math.max(...sectors.map(s => Math.abs(s.changePercent)), 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {sectors.map(s => {
        const pct = s.changePercent;
        const up = pct >= 0;
        const intensity = Math.min(Math.abs(pct) / max, 1);

        const bg = up
          ? `rgba(52,211,153,${0.08 + intensity * 0.35})`
          : `rgba(248,113,113,${0.08 + intensity * 0.35})`;

        return (
          <div
            key={s.symbol}
            className="p-3 text-center transition-all hover:scale-[1.02] cursor-default rounded-sm"
            style={{ background: bg }}
          >
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1">{s.symbol}</p>
            <p className="text-[11px] font-bold text-white/80">{s.name}</p>
            <p className={`text-[13px] font-black font-mono mt-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? '+' : ''}{pct.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

function KrStockHeatmap({ stocks }: { stocks: KrStockData[] }) {
  const max = Math.max(...stocks.map(s => Math.abs(s.changePercent)), 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {stocks.map(s => {
        const pct = s.changePercent;
        const up = pct >= 0;
        const intensity = Math.min(Math.abs(pct) / max, 1);
        const bg = up
          ? `rgba(52,211,153,${0.08 + intensity * 0.35})`
          : `rgba(248,113,113,${0.08 + intensity * 0.35})`;

        return (
          <div
            key={s.symbol}
            className="p-3 transition-all hover:scale-[1.02] cursor-default rounded-sm"
            style={{ background: bg }}
          >
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-0.5">{s.sector}</p>
            <p className="text-[12px] font-bold text-white/80 leading-tight">{s.name}</p>
            {s.price && (
              <p className="text-[10px] text-white/40 font-mono mt-0.5">
                ₩{s.price.toLocaleString()}
              </p>
            )}
            <p className={`text-[13px] font-black font-mono mt-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? '+' : ''}{pct.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1c1a] border border-white/10 px-4 py-3 text-[11px] font-mono">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="text-emerald-400 font-bold">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Lab() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [krStocks, setKrStocks] = useState<KrStockData[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [activeSymbol, setActiveSymbol] = useState('^GSPC');
  const [activeRange, setActiveRange] = useState<Range>('1mo');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 지수 + 섹터 + KR 종목 초기 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/market/indices').then(r => r.json()).catch(() => []),
      fetch('/api/market/sectors').then(r => r.json()).catch(() => []),
      fetch('/api/market/kr-stocks').then(r => r.json()).catch(() => []),
    ]).then(([idx, sec, kr]) => {
      setIndices(Array.isArray(idx) ? idx : []);
      setSectors(Array.isArray(sec) ? sec : []);
      setKrStocks(Array.isArray(kr) ? kr : []);
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    });
  }, []);

  // 차트 데이터 로드
  const loadChart = useCallback((symbol: string, range: Range) => {
    setChartLoading(true);
    fetch(`/api/market/chart?symbol=${symbol}&range=${range}`)
      .then(r => r.json())
      .then(data => {
        setChartData(Array.isArray(data) ? data : []);
        setChartLoading(false);
      })
      .catch(() => {
        setChartData([]);
        setChartLoading(false);
      });
  }, []);

  useEffect(() => {
    loadChart(activeSymbol, activeRange);
  }, [activeSymbol, activeRange, loadChart]);

  const usIndices = indices.filter(i => i.region === 'US' && i.symbol !== '^VIX');
  const vix = indices.find(i => i.symbol === '^VIX');
  const krIndices = indices.filter(i => i.region === 'KR');
  const globalIndices = indices.filter(i => !['US', 'KR'].includes(i.region));

  const activeChartMeta = CHART_SYMBOLS.find(s => s.symbol === activeSymbol);
  const firstClose = chartData[0]?.close ?? 0;
  const lastClose = chartData[chartData.length - 1]?.close ?? 0;
  const chartUp = lastClose >= firstClose;

  return (
    <main className="min-h-screen px-6 md:px-10 py-10 font-sans text-white">
      <div className="max-w-[1400px] mx-auto space-y-12">

        {/* ── 헤더 ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-block px-3 py-1 border border-accent text-accent-light text-[9px] font-mono tracking-widest uppercase">
              System.Status: Live
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none">
              MARKET <br />
              <span className="text-accent">OVERVIEW</span>
            </h2>
            <p className="text-white/30 text-xs font-mono">
              Global market indices · Sector performance · phorage lab
            </p>
          </div>
          {lastUpdated && (
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border border-white/5 bg-white/2 p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── 주요 지수 카드 ── */}
            <section className="space-y-4">
              <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
                ── US Markets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {usIndices.map(idx => <IndexCard key={idx.symbol} data={idx} />)}
                {vix && <IndexCard data={vix} />}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
                ── KR Markets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {krIndices.map(idx => <IndexCard key={idx.symbol} data={idx} />)}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
                ── Global
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {globalIndices.map(idx => <IndexCard key={idx.symbol} data={idx} />)}
              </div>
            </section>
          </>
        )}

        {/* ── 차트 ── */}
        <section className="border border-white/8 bg-white/2 p-6 space-y-6">
          {/* 심볼 탭 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {CHART_SYMBOLS.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => setActiveSymbol(s.symbol)}
                  className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all ${
                    activeSymbol === s.symbol
                      ? 'bg-accent text-white'
                      : 'border border-white/10 text-white/40 hover:text-white/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {/* 기간 탭 */}
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-all ${
                    activeRange === r
                      ? 'text-accent-light border-b border-accent'
                      : 'text-white/25 hover:text-white/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 차트 헤더 */}
          {chartData.length > 0 && !chartLoading && (
            <div className="flex items-baseline gap-4">
              <span className="text-2xl font-black text-white">
                {lastClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-mono font-bold ${chartUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {chartUp ? '+' : ''}{((lastClose - firstClose) / firstClose * 100).toFixed(2)}%
                <span className="text-white/30 font-normal ml-1 text-[10px]">({activeRange})</span>
              </span>
              <span className="text-[10px] text-white/30 font-mono">{activeChartMeta?.label}</span>
            </div>
          )}

          {/* 차트 본체 */}
          <div className="h-64 md:h-80">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest animate-pulse">
                  Loading chart data...
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartUp ? '#34d399' : '#f87171'} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={chartUp ? '#34d399' : '#f87171'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickFormatter={v => v.toLocaleString()}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={chartUp ? '#34d399' : '#f87171'}
                    strokeWidth={1.5}
                    fill="url(#chartGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: chartUp ? '#34d399' : '#f87171' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── 섹터 히트맵 ── */}
        <section className="space-y-4">
          <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
            ── US Sector Performance (SPDR ETF)
          </h3>
          {sectors.length > 0 ? (
            <SectorHeatmap sectors={sectors} />
          ) : (
            <div className="h-32 flex items-center justify-center border border-white/5">
              <p className="text-[9px] font-mono text-white/20 animate-pulse uppercase tracking-widest">
                Loading sector data...
              </p>
            </div>
          )}
        </section>

        {/* ── KR 주요 종목 히트맵 ── */}
        <section className="space-y-4">
          <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
            ── KR Major Stocks (KRX)
          </h3>
          {krStocks.length > 0 ? (
            <KrStockHeatmap stocks={krStocks} />
          ) : (
            <div className="h-32 flex items-center justify-center border border-white/5">
              <p className="text-[9px] font-mono text-white/20 animate-pulse uppercase tracking-widest">
                Loading KR stock data...
              </p>
            </div>
          )}
        </section>

        {/* 하단 여백 */}
        <div className="h-8" />
      </div>
    </main>
  );
}
