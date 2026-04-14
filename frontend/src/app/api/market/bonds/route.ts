import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const BONDS = [
  { symbol: '^TNX',  name: 'US 10Y Treasury', maturity: '10Y' },
  { symbol: '^FVX',  name: 'US 5Y Treasury',  maturity: '5Y' },
  { symbol: '^TYX',  name: 'US 30Y Treasury', maturity: '30Y' },
  { symbol: '^IRX',  name: 'US 3M T-Bill',    maturity: '3M' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      BONDS.map(b => yahooFinance.quote(b.symbol))
    );

    const data = results.map((result, i) => {
      const meta = BONDS[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          maturity: meta.maturity,
          yield: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      }
      return { symbol: meta.symbol, name: meta.name, maturity: meta.maturity, yield: null, change: null, changePercent: 0, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bond data' }, { status: 500 });
  }
}
