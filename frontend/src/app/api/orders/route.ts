import { NextResponse } from 'next/server';
import { OrderInput } from '@/lib/orders-schema';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { buildBuyerEmail, buildOwnerEmail, sendEmails } from '@/lib/order-email';
import { withColumnFallback } from '@/lib/db-compat';
import { resolveOrderItems, type OrderableProduct } from '@/lib/order-items';

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`orders:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: '주문 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = OrderInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력한 주문 정보가 올바르지 않습니다. 다시 확인해주세요.', details: parsed.error.issues.map(i => i.message) },
      { status: 400 },
    );
  }
  const { name, email, phone, zipcode, address, note, items } = parsed.data;

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('orders.config', error);
    return NextResponse.json(
      { error: 'Admin database is not configured' },
      { status: 503 },
    );
  }

  // 서버에서 상품 정보 재조회하여 가격/재고 검증 — 클라이언트 값 절대 신뢰 금지.
  //
  // 옵션이 있는 상품의 가격은 `options` 안에 있다. 손님이 보낸 옵션 id로 그
  // 배열에서 옵션을 다시 찾고, 그 옵션의 가격으로 합계를 낸다
  // (`resolveOrderItems`). 본문에는 애초에 가격 필드가 없다(`orders-schema.ts`).
  //
  // `status`·`options`는 마이그레이션(20260917020000_shop_ready) 이후 컬럼이다.
  // 없으면 예전 컬럼만 읽고, 상태는 backfill과 같은 규칙(`in_stock && price > 0`)
  // 으로 계산된다 — 적용 전에도 주문은 받는다.
  const productIds = [...new Set(items.map(i => i.id))];
  const { data: products, error: prodErr } = await withColumnFallback(
    'orders.product_lookup',
    () => supabase.from('products').select('id, name, price, in_stock, status, options').in('id', productIds),
    () => supabase.from('products').select('id, name, price, in_stock').in('id', productIds),
  );

  if (prodErr) {
    log.error('orders.product_lookup', prodErr);
    return NextResponse.json({ error: '상품 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }

  const resolution = resolveOrderItems(items, (products ?? []) as OrderableProduct[]);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.error }, { status: 400 });
  }
  const { items: resolved, total: total_price } = resolution;

  const { data: order, error: dbError } = await supabase
    .from('orders')
    .insert({
      name,
      email,
      phone: phone || null,
      zipcode: zipcode || null,
      address,
      note: note || null,
      items: resolved,
      total_price,
    })
    .select('id')
    .single();

  if (dbError) {
    log.error('orders.insert', dbError);
    return NextResponse.json({ error: '주문을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }

  const orderId = order.id;

  // 메일 본문은 `lib/order-email.ts`에 있다 — 관리 화면의 재발송이 같은 함수를 쓴다.
  const emailOrder = {
    id: orderId,
    name,
    email,
    phone: phone || null,
    zipcode: zipcode || null,
    address,
    note: note || null,
    items: resolved,
    total_price,
  };

  try {
    await sendEmails([buildBuyerEmail(emailOrder), buildOwnerEmail(emailOrder)]);
  } catch (emailErr) {
    log.error('orders.email_send', emailErr);
    // 이메일 실패는 주문 성공에 영향 안 줌
  }

  return NextResponse.json({ success: true, orderId, total_price });
}
