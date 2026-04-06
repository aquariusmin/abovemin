import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

// US 섹터 ETF (SPDR)
const SECTORS = [
  { symbol: 'XLK',  name: 'Technology' },
  { symbol: 'XLF',  name: 'Financials' },
  { symbol: 'XLV',  name: 'Health Care' },
  { symbol: 'XLY',  name: 'Cons. Discret.' },
  { symbol: 'XLP',  name: 'Cons. Staples' },
  { symbol: 'XLE',  name: 'Energy' },
  { symbol: 'XLI',  name: 'Industrials' },
  { symbol: 'XLB',  name: 'Materials' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLU',  name: 'Utilities' },
  { symbol: 'XLC',  name: 'Comm. Services' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SECTORS.map(s => yahooFinance.quote(s.symbol))
    );

    const data = results.map((result, i) => {
      const meta = SECTORS[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          changePercent: q.regularMarketChangePercent ?? 0,
          price: q.regularMarketPrice ?? null,
        };
      }
      return { symbol: meta.symbol, name: meta.name, changePercent: 0, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
  }
}
