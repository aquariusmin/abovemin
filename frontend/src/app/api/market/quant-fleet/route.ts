import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(request: Request) {
  // Optional ?id= scopes the response to a single bot so the detail view
  // doesn't download every bot's full equity_curve just to render one.
  const id = new URL(request.url).searchParams.get('id');

  // `select('*')`, deliberately, and not an explicit column list.
  //
  // Naming the ten columns the table renders looks like the obvious saving on
  // an endpoint the console polls every minute. Measured against the live
  // table it is worth ~6%: `equity_curve` is most of the payload and the list
  // needs it for the sparklines. And it is actively unsafe here — the sync
  // container owns this schema and lags it (`currency` and `holdings` are in
  // `FleetBot` but not yet in the deployed table). `*` tolerates a column that
  // does not exist yet; an explicit list fails the whole request with 42703.
  //
  // The polling cost is addressed where it actually is: the client stops
  // requesting entirely while its tab is hidden. See `FleetDashboard`.
  let query = supabase.from('quant_fleet').select('*');
  query = id
    ? query.eq('id', id)
    : query.order('equity', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch fleet data' }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
