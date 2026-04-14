import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const CRYPTOS = [
  { symbol: 'BTC-USD',  name: 'Bitcoin' },
  { symbol: 'ETH-USD',  name: 'Ethereum' },
  { symbol: 'SOL-USD',  name: 'Solana' },
  { symbol: 'XRP-USD',  name: 'XRP' },
  { symbol: 'ADA-USD',  name: 'Cardano' },
  { symbol: 'AVAX-USD', name: 'Avalanche' },
  { symbol: 'DOGE-USD', name: 'Dogecoin' },
  { symbol: 'DOT-USD',  name: 'Polkadot' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      CRYPTOS.map(c => yahooFinance.quote(c.symbol))
    );

    const data = results.map((result, i) => {
      const meta = CRYPTOS[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          price: q.regularMarketPrice ?? null,
          changePercent: q.regularMarketChangePercent ?? 0,
          change: q.regularMarketChange ?? null,
          marketCap: q.marketCap ?? null,
        };
      }
      return { symbol: meta.symbol, name: meta.name, price: null, changePercent: 0, change: null, marketCap: null, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch crypto data' }, { status: 500 });
  }
}
