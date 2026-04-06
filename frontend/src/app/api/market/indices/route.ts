import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const INDICES = [
  { symbol: '^GSPC',  name: 'S&P 500',   region: 'US' },
  { symbol: '^IXIC',  name: 'NASDAQ',    region: 'US' },
  { symbol: '^DJI',   name: 'DOW',       region: 'US' },
  { symbol: '^RUT',   name: 'Russell 2000', region: 'US' },
  { symbol: '^VIX',   name: 'VIX',       region: 'US' },
  { symbol: '^KS11',  name: 'KOSPI',     region: 'KR' },
  { symbol: '^KQ11',  name: 'KOSDAQ',    region: 'KR' },
  { symbol: '^N225',  name: 'Nikkei 225',region: 'JP' },
  { symbol: '^HSI',   name: 'Hang Seng', region: 'HK' },
  { symbol: 'DX-Y.NYB', name: 'USD Index', region: 'FX' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      INDICES.map(idx => yahooFinance.quote(idx.symbol))
    );

    const data = results.map((result, i) => {
      const meta = INDICES[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          region: meta.region,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePercent: q.regularMarketChangePercent ?? null,
          previousClose: q.regularMarketPreviousClose ?? null,
          open: q.regularMarketOpen ?? null,
          high: q.regularMarketDayHigh ?? null,
          low: q.regularMarketDayLow ?? null,
        };
      }
      return { symbol: meta.symbol, name: meta.name, region: meta.region, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 });
  }
}
