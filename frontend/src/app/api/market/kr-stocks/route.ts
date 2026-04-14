import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

const KR_STOCKS = [
  { symbol: '005930.KS', name: '삼성전자',   sector: 'IT' },
  { symbol: '000660.KS', name: 'SK하이닉스', sector: 'IT' },
  { symbol: '035420.KS', name: 'NAVER',      sector: '플랫폼' },
  { symbol: '035720.KS', name: '카카오',     sector: '플랫폼' },
  { symbol: '005380.KS', name: '현대차',     sector: '자동차' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', sector: '2차전지' },
  { symbol: '005490.KS', name: 'POSCO홀딩스', sector: '철강' },
  { symbol: '105560.KS', name: 'KB금융',     sector: '금융' },
  { symbol: '055550.KS', name: '신한지주',   sector: '금융' },
  { symbol: '207940.KS', name: '삼성바이오로직스', sector: '바이오' },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      KR_STOCKS.map(s => yahooFinance.quote(s.symbol))
    );

    const data = results.map((result, i) => {
      const meta = KR_STOCKS[i];
      if (result.status === 'fulfilled') {
        const q = result.value as any;
        return {
          symbol: meta.symbol,
          name: meta.name,
          sector: meta.sector,
          price: q.regularMarketPrice ?? null,
          changePercent: q.regularMarketChangePercent ?? 0,
          change: q.regularMarketChange ?? null,
        };
      }
      return { symbol: meta.symbol, name: meta.name, sector: meta.sector, price: null, changePercent: 0, change: null, error: true };
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KR stocks' }, { status: 500 });
  }
}
