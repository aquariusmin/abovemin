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
