import { NextResponse } from 'next/server';
import { OrderInput } from '@/lib/orders-schema';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { buildBuyerEmail, buildOwnerEmail, sendEmails } from '@/lib/order-email';

interface ResolvedItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

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
  const productIds = [...new Set(items.map(i => i.id))];
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, price, in_stock')
    .in('id', productIds);

  if (prodErr) {
    log.error('orders.product_lookup', prodErr);
    return NextResponse.json({ error: '상품 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }

  const byId = new Map<number, { id: number; name: string; price: number; in_stock: boolean }>(
    (products ?? []).map(p => [p.id as number, p as { id: number; name: string; price: number; in_stock: boolean }]),
  );

  const resolved: ResolvedItem[] = [];
  for (const item of items) {
    const product = byId.get(item.id);
    if (!product) {
      return NextResponse.json(
        { error: '장바구니에 더 이상 판매하지 않는 상품이 있습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.' },
        { status: 400 },
      );
    }
    if (!product.in_stock) {
      return NextResponse.json(
        { error: `'${product.name}'은(는) 품절되었습니다. 장바구니에서 삭제한 뒤 다시 시도해주세요.` },
        { status: 400 },
      );
    }
    resolved.push({ id: product.id, name: product.name, price: product.price, quantity: item.quantity });
  }
  const total_price = resolved.reduce((s, i) => s + i.price * i.quantity, 0);

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
