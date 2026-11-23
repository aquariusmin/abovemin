import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { rateLimitShared } from '@/lib/rate-limit';
import { OrderEmail } from '@/lib/admin/schemas';
import { buildBuyerEmail, buildShippingEmail, hasBuyerEmail, sendEmailsOrThrow, type EmailOrder } from '@/lib/order-email';
import { recordEmailSent } from '@/lib/order-email-status';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

// 레이트 리밋은 주문 단위(연타)와 전체 단위(세션 유출) 두 겹이다.
const PER_ORDER = { limit: 3, windowMs: 10 * 60 * 1000 };
const GLOBAL = { limit: 20, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, OrderEmail);
  if (!body.ok) return body.response;

  const { id, kind } = body.value;
  const [perOrder, global] = await Promise.all([
    rateLimitShared(`admin-order-email:${id}`, PER_ORDER),
    rateLimitShared('admin-order-email:all', GLOBAL),
  ]);
  if (!perOrder.ok || !global.ok) {
    return jsonError('메일을 너무 자주 보냈습니다. 잠시 후 다시 시도해 주세요.', 429);
  }

  const db = adminDb('admin_orders_email');
  if (!db.ok) return db.response;

  const { data: order, error } = await db.value.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) return dbErrorResponse('admin_orders_email_lookup', error);
  if (!order) return jsonError('주문을 찾을 수 없습니다.', 404);
  const target = order as EmailOrder;
  if (!hasBuyerEmail(target)) {
    return jsonError('이메일이 없는 주문입니다. 연락처로 안내해 주세요.', 400);
  }

  let message;
  if (kind === 'shipping') {
    if (!order.tracking_number) {
      return jsonError('송장번호가 없어 배송 안내를 보낼 수 없습니다. 먼저 송장번호를 저장해 주세요.', 400);
    }
    message = buildShippingEmail(target, {
      carrier: order.tracking_carrier ?? null,
      trackingNumber: order.tracking_number,
    });
  } else {
    message = buildBuyerEmail({ ...target, items: Array.isArray(order.items) ? order.items : [] });
  }

  try {
    await sendEmailsOrThrow([message]);
  } catch (sendError) {
    log.error('admin_orders_email_send', sendError);
    return jsonError('메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 502);
  }

  log.info('admin_orders_email_resent', { id, kind });

  // 기록이 실패해도(컬럼 없음 포함) 메일은 이미 나갔으므로 응답은 성공이다.
  if (kind !== 'shipping') {
    const recorded = await recordEmailSent(db.value, id, { buyer_email_sent_at: new Date().toISOString() });
    if (recorded === 'failed') log.error('admin_orders_email_record', { id });
  }
  return NextResponse.json({ ok: true });
}
