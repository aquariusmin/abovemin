import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') ?? '^GSPC';
  const range = searchParams.get('range') ?? '1mo'; // 1d, 5d, 1mo, 3mo, 6mo, 1y

  const intervalMap: Record<string, string> = {
    '1d':  '5m',
    '5d':  '15m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1wk',
    '1y':  '1wk',
  };

  try {
    const result = await yahooFinance.chart(symbol, {
      period1: getPeriodStart(range),
      interval: intervalMap[range] as '5m' | '15m' | '1d' | '1wk',
    }) as any;

    const quotes = result.quotes.map((q: any) => ({
      date: new Date(q.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      close: q.close ? parseFloat(q.close.toFixed(2)) : null,
      volume: q.volume ?? null,
    })).filter((q: any) => q.close !== null);

    return NextResponse.json(quotes, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}

function getPeriodStart(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1d':  return new Date(now.setDate(now.getDate() - 1));
    case '5d':  return new Date(now.setDate(now.getDate() - 5));
    case '1mo': return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo': return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo': return new Date(now.setMonth(now.getMonth() - 6));
    case '1y':  return new Date(now.setFullYear(now.getFullYear() - 1));
    default:    return new Date(now.setMonth(now.getMonth() - 1));
  }
}
