import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const COMMODITIES = [
  { symbol: 'GC=F',  name: 'Gold',          unit: '$/oz' },
  { symbol: 'SI=F',  name: 'Silver',        unit: '$/oz' },
  { symbol: 'CL=F',  name: 'Crude Oil (WTI)', unit: '$/bbl' },
  { symbol: 'BZ=F',  name: 'Brent Oil',     unit: '$/bbl' },
  { symbol: 'NG=F',  name: 'Natural Gas',   unit: '$/MMBtu' },
  { symbol: 'HG=F',  name: 'Copper',        unit: '$/lb' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      COMMODITIES.map(c => yahooFinance.quote(c.symbol))
    );

    const data = results.map((result, i) => {
      const meta = COMMODITIES[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          unit: meta.unit,
          price: q.regularMarketPrice ?? null,
          changePercent: q.regularMarketChangePercent ?? 0,
          change: q.regularMarketChange ?? null,
        };
      }
      return { symbol: meta.symbol, name: meta.name, unit: meta.unit, price: null, changePercent: 0, change: null, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch commodities' }, { status: 500 });
  }
}
