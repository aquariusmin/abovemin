import { NextResponse } from 'next/server';
import { OrderInput, isHoneypotFilled } from '@/lib/orders-schema';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitShared, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { buildBuyerEmail, buildOwnerEmail, sendEmails } from '@/lib/order-email';
import { isMissingColumnError, isUniqueViolation, withColumnFallback } from '@/lib/db-compat';
import { resolveOrderItems, type OrderableProduct } from '@/lib/order-items';

/**
 * 주문 한 건은 메일 두 통(손님·운영자)을 부른다. 이 엔드포인트는 로그인 없이
 * 열려 있으므로, 레이트 리밋이 곧 "남의 주소로 우리 도메인 메일을 보내게
 * 만드는 것"에 대한 방어다. 세 겹이다.
 *
 *  - IP: 한 곳에서 몰아치는 것.
 *  - 받는 사람(소문자 이메일): IP를 바꿔 가며 한 사람에게 메일을 쏟는 것.
 *    이건 주문을 받기 **전에** 막는다 — 메일만 빼고 주문을 받으면 가짜 주문이
 *    관리 화면에 쌓인다.
 *  - 전체: 누가 주소 목록을 돌리는 것. 손님 메일만 멈추고 주문은 받는다 —
 *    진짜 손님의 주문을 놓치는 것이 더 나쁘고, 입금 안내는 관리 화면에서 다시
 *    보낼 수 있다(`api/admin/orders/email`). 발신 도메인 평판은 한 번 떨어지면
 *    주문 메일까지 스팸함에 들어간다.
 *
 * 전부 `rateLimitShared` — in-memory 카운터는 서버리스에서 "인스턴스당"이다.
 */
const PER_IP = { limit: 10, windowMs: 10 * 60 * 1000 };
const PER_RECIPIENT = { limit: 3, windowMs: 60 * 60 * 1000 };
const BUYER_EMAIL_GLOBAL = { limit: 30, windowMs: 60 * 60 * 1000 };

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

interface ExistingOrder {
  id: number;
  total_price: number;
}

/**
 * 멱등 키로 이미 들어온 주문을 찾는다. 컬럼이 아직 없거나(마이그레이션 전)
 * 조회가 실패하면 "없음"으로 본다 — 중복 방지를 위해 주문 자체를 막지는
 * 않는다. 조회를 놓쳐도 insert가 유니크 인덱스에 걸리면 다시 여기로 온다.
 */
async function findOrderByIdempotencyKey(supabase: AdminClient, key: string | null): Promise<ExistingOrder | null> {
  if (!key) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_price')
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error) {
    if (!isMissingColumnError(error)) log.warn('orders.idempotency_lookup', error);
    return null;
  }
  return (data as ExistingOrder | null) ?? null;
}

function replayResponse(order: ExistingOrder) {
  log.info('orders.idempotent_replay', { orderId: order.id });
  return NextResponse.json({ success: true, orderId: order.id, total_price: order.total_price });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = await rateLimitShared(`orders:${ip}`, PER_IP);
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
  const { name, email, phone, zipcode, address, note, items, website, idempotency_key } = parsed.data;

  // 허니팟이 채워져 왔다: 봇. 성공처럼 보이게 답하되 아무것도 남기지 않는다 —
  // 오류로 답하면 봇이 무엇이 걸렸는지 배운다.
  if (isHoneypotFilled(website)) {
    log.warn('orders.honeypot', { ip });
    return NextResponse.json({ success: true, orderId: Math.floor(Date.now() / 1000) % 100000 });
  }

  let supabase: AdminClient;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('orders.config', error);
    return NextResponse.json(
      { error: 'Admin database is not configured' },
      { status: 503 },
    );
  }

  // 같은 제출이 다시 왔다(응답을 못 받고 또 누름, 네트워크 재시도): 새로 넣지
  // 않고 먼저 들어간 주문으로 답한다. 메일도 다시 보내지 않는다. 받는 사람
  // 레이트 리밋보다 먼저 보는 이유 — 재시도가 손님의 한도를 깎으면 안 된다.
  const idempotencyKey = idempotency_key ?? null;
  const existing = await findOrderByIdempotencyKey(supabase, idempotencyKey);
  if (existing) return replayResponse(existing);

  const recipient = await rateLimitShared(`orders:to:${email.trim().toLowerCase()}`, PER_RECIPIENT);
  if (!recipient.ok) {
    return NextResponse.json(
      { error: '같은 이메일로 주문이 너무 잦습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
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

  const row = {
    name,
    email,
    phone: phone || null,
    zipcode: zipcode || null,
    address,
    note: note || null,
    items: resolved,
    total_price,
  };
  // `idempotency_key`는 `20260927000000_orders_idempotency` 이후 컬럼이다. 없으면
  // 키 없이 넣는다 — 중복 방지만 꺼질 뿐 주문은 받는다.
  const { data: order, error: dbError } = await withColumnFallback(
    'orders.insert',
    () => supabase.from('orders').insert(idempotencyKey ? { ...row, idempotency_key: idempotencyKey } : row).select('id').single(),
    () => supabase.from('orders').insert(row).select('id').single(),
  );

  // 같은 키의 요청이 동시에 들어와 둘 다 위의 조회를 통과했다. 늦은 쪽이 유니크
  // 인덱스에 막힌 것이니, 먼저 들어간 주문으로 답한다.
  if (dbError && idempotencyKey && isUniqueViolation(dbError)) {
    const winner = await findOrderByIdempotencyKey(supabase, idempotencyKey);
    if (winner) return replayResponse(winner);
  }

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

  const buyerQuota = await rateLimitShared('orders:buyer-email:all', BUYER_EMAIL_GLOBAL);
  if (!buyerQuota.ok) log.warn('orders.buyer_email_capped', { orderId });
  const messages = buyerQuota.ok ? [buildBuyerEmail(emailOrder), buildOwnerEmail(emailOrder)] : [buildOwnerEmail(emailOrder)];

  try {
    await sendEmails(messages);
  } catch (emailErr) {
    log.error('orders.email_send', emailErr);
    // 이메일 실패는 주문 성공에 영향 안 줌
  }

  return NextResponse.json({ success: true, orderId, total_price });
}
