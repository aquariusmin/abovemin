import { NextResponse, after } from 'next/server';
import { OrderInput, isHoneypotFilled } from '@/lib/orders-schema';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitShared, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { OWNER_EMAIL, buildOwnerEmail, configuredBankInfo, sendEmails, type EmailMessage } from '@/lib/order-email';
import { emailSentPatch, recordEmailSent, type OrderEmailKind } from '@/lib/order-email-status';
import { isMissingColumnError, isUniqueViolation, withColumnFallback } from '@/lib/db-compat';
import { resolveOrderItems, type OrderableProduct } from '@/lib/order-items';
import { orderPlacedBody } from '@/lib/order-placed';
import { noteWithPickupTag, type DeliveryMethod } from '@/lib/delivery';

// 공개 엔드포인트라 레이트 리밋이 남용 방어다 — IP·연락처 두 겹, 모두 rateLimitShared.
const PER_IP = { limit: 10, windowMs: 10 * 60 * 1000 };
const PER_CONTACT = { limit: 3, windowMs: 60 * 60 * 1000 };

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

interface ExistingOrder {
  id: number;
  total_price: number;
}

// 컬럼이 없거나(마이그레이션 전) 조회가 실패하면 "없음"으로 본다 — 주문 자체는 막지 않는다.
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
  return NextResponse.json(orderPlacedBody(order.id, order.total_price, configuredBankInfo()));
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
  const { name, phone, zipcode, address, note, items, website, idempotency_key } = parsed.data;
  // 옛 탭은 수령 방법 없이 온다 — 그때까지는 전부 택배였다.
  const deliveryMethod: DeliveryMethod = parsed.data.delivery_method ?? 'parcel';
  const pickup = deliveryMethod === 'pickup';

  // 허니팟: 봇에게도 성공처럼 답하되 아무것도 남기지 않는다.
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

  // 멱등 재시도는 수신자 레이트 리밋보다 먼저 본다 — 재시도가 손님의 한도를 깎지 않게.
  const idempotencyKey = idempotency_key ?? null;
  const existing = await findOrderByIdempotencyKey(supabase, idempotencyKey);
  if (existing) return replayResponse(existing);

  const contactKey = phone.replace(/\D/g, '') || phone.toLowerCase();
  const contact = await rateLimitShared(`orders:contact:${contactKey}`, PER_CONTACT);
  if (!contact.ok) {
    return NextResponse.json(
      { error: '같은 연락처로 주문이 너무 잦습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  // 가격·재고는 서버가 DB에서 다시 계산한다. status/options/addons 컬럼이 없으면 한 겹씩 벗겨 읽는다.
  const productIds = [...new Set(items.map(i => i.id))];
  type ProductLookup = { data: unknown[] | null; error: unknown };
  const { data: products, error: prodErr } = await withColumnFallback<ProductLookup>(
    'orders.product_lookup',
    () => supabase.from('products').select('id, name, price, in_stock, status, options, addons').in('id', productIds),
    () =>
      withColumnFallback<ProductLookup>(
        'orders.product_lookup.shop_ready',
        () => supabase.from('products').select('id, name, price, in_stock, status, options').in('id', productIds),
        () => supabase.from('products').select('id, name, price, in_stock').in('id', productIds),
      ),
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

  // orders.address는 NOT NULL이라 대면 전달은 빈 문자열이다.
  const row: {
    name: string;
    email: string | null;
    phone: string;
    zipcode: string | null;
    address: string;
    note: string | null;
    items: typeof resolved;
    total_price: number;
    delivery_method?: DeliveryMethod;
  } = {
    name,
    email: null,
    phone,
    zipcode: pickup ? null : zipcode || null,
    address: pickup ? '' : address,
    note: note || null,
    items: resolved,
    total_price,
    delivery_method: deliveryMethod,
  };
  // idempotency_key는 20260927000000_orders_idempotency 이후 컬럼 — 없으면 키 없이 넣는다.
  const insertKeyed = (values: typeof row) => {
    const keyed: typeof row & { idempotency_key?: string } = idempotencyKey ? { ...values, idempotency_key: idempotencyKey } : values;
    return withColumnFallback(
      'orders.insert',
      () => supabase.from('orders').insert(keyed).select('id').single(),
      () => supabase.from('orders').insert(values).select('id').single(),
    );
  };
  // delivery_method는 20261123010000_orders_delivery_method 이후 컬럼 — 없으면 메모 앞 표시로 남긴다.
  const insertOrder = (values: typeof row) => {
    const { delivery_method, ...legacy } = values;
    return withColumnFallback(
      'orders.insert.delivery_method',
      () => insertKeyed(values),
      () => insertKeyed(delivery_method === 'pickup' ? { ...legacy, note: noteWithPickupTag(legacy.note) } : legacy),
    );
  };
  const { data: order, error: dbError } = await insertOrder(row);

  // 동시 요청이 유니크 인덱스에 막혔다 — 먼저 들어간 주문으로 답한다.
  if (dbError && idempotencyKey && isUniqueViolation(dbError)) {
    const winner = await findOrderByIdempotencyKey(supabase, idempotencyKey);
    if (winner) return replayResponse(winner);
  }

  if (dbError || !order) {
    log.error('orders.insert', dbError);
    return NextResponse.json({ error: '주문을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }

  const orderId = order.id;

  const emailOrder = {
    id: orderId,
    name,
    email: null,
    phone,
    zipcode: row.zipcode,
    address: row.address,
    delivery_method: deliveryMethod,
    note: note || null,
    items: resolved,
    total_price,
  };

  // 메일은 응답 뒤(`after`)에 보낸다 — 응답이 늦으면 손님이 다시 눌러 주문이 두 번 들어간다.
  after(async () => {
    try {
      const kinds: OrderEmailKind[] = [];
      const messages: EmailMessage[] = [];
      if (OWNER_EMAIL) {
        kinds.push('owner');
        messages.push(buildOwnerEmail(emailOrder, OWNER_EMAIL));
      } else {
        log.error('orders.owner_email_unset', { orderId });
      }
      if (messages.length === 0) return;

      const outcomes = await sendEmails(messages);
      outcomes.forEach((outcome, i) => {
        if (!outcome.ok) log.error('orders.email_send', { orderId, kind: kinds[i], error: outcome.error });
      });

      const recorded = await recordEmailSent(supabase, orderId, emailSentPatch(kinds, outcomes, new Date().toISOString()));
      if (recorded === 'failed') log.error('orders.email_status_record', { orderId });
    } catch (afterErr) {
      log.error('orders.email_after', { orderId, error: afterErr instanceof Error ? afterErr.message : String(afterErr) });
    }
  });

  // 계좌 정보를 응답에도 싣는다 — 메일이 늦거나 스팸함에 가도 완료 화면만으로 입금할 수 있게.
  return NextResponse.json(orderPlacedBody(orderId, total_price, configuredBankInfo()));
}
