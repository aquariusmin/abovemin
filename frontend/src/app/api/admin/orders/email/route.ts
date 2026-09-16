import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { rateLimitShared } from '@/lib/rate-limit';
import { OrderEmail } from '@/lib/admin/schemas';
import { buildBuyerEmail, buildShippingEmail, sendEmails, type EmailOrder } from '@/lib/order-email';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

/**
 * 고객에게 안내 메일을 다시 보낸다 — 주문 접수 확인(입금 안내) 또는 배송 안내.
 *
 * 본문은 주문 접수 때와 **같은 함수**로 만든다(`lib/order-email.ts`). 운영자
 * 알림은 다시 보내지 않는다 — 재발송의 목적은 고객이 못 받은 메일이다.
 *
 * 레이트 리밋이 두 겹인 이유: 버튼을 연타해 한 고객에게 메일 열 통이 가는 것은
 * 주문 하나 단위로 막고, 세션이 새어 누군가 모든 주문에 메일을 돌리는 것은
 * 전체 단위로 막는다. 발신 도메인 평판은 한 번 떨어지면 주문 메일까지 스팸함에
 * 들어간다.
 */
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

  let message;
  if (kind === 'shipping') {
    if (!order.tracking_number) {
      return jsonError('송장번호가 없어 배송 안내를 보낼 수 없습니다. 먼저 송장번호를 저장해 주세요.', 400);
    }
    message = buildShippingEmail(order as EmailOrder, {
      carrier: order.tracking_carrier ?? null,
      trackingNumber: order.tracking_number,
    });
  } else {
    message = buildBuyerEmail({ ...(order as EmailOrder), items: Array.isArray(order.items) ? order.items : [] });
  }

  try {
    await sendEmails([message]);
  } catch (sendError) {
    log.error('admin_orders_email_send', sendError);
    return jsonError('메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 502);
  }

  log.info('admin_orders_email_resent', { id, kind });
  return NextResponse.json({ ok: true });
}
