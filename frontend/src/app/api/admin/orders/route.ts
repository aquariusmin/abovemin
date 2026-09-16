import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { isMissingColumnError } from '@/lib/db-compat';
import { OrderUpdate } from '@/lib/admin/schemas';
import { buildShippingEmail, sendEmails, type EmailOrder } from '@/lib/order-email';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_orders');
  if (!db.ok) return db.response;

  // 목록은 `select('*')`라 마이그레이션 전후 모두 읽힌다. 다만 주문이 0건이면
  // 행을 보고 새 컬럼이 있는지 알 수 없으므로, 한 컬럼만 따로 찔러 본다.
  const [list, probe] = await Promise.all([
    db.value.from('orders').select('*').order('created_at', { ascending: false }),
    db.value.from('orders').select('admin_memo').limit(1),
  ]);

  if (list.error) return dbErrorResponse('admin_orders_fetch', list.error);
  if (probe.error && !isMissingColumnError(probe.error)) log.warn('admin_orders_probe', probe.error);

  return NextResponse.json({
    orders: list.data ?? [],
    migrationPending: Boolean(probe.error && isMissingColumnError(probe.error)),
  });
}

/**
 * 주문 상태·송장·관리자 메모를 고친다. 보낸 필드만 바뀐다.
 *
 * 상태가 `shipped`로 **바뀌는 순간**에 송장번호가 있고 `notify`가 꺼져 있지
 * 않으면 배송 안내 메일을 보낸다. "바뀌는 순간"을 서버가 판단하는 이유: 이미
 * 배송 중인 주문의 메모만 고쳤는데 메일이 또 나가면 안 된다.
 *
 * 메일이 실패해도 상태 변경은 되돌리지 않는다 — 택배는 이미 나갔다. 대신
 * `email: 'failed'`로 알려 화면에서 다시 보내게 한다.
 */
export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, OrderUpdate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_orders');
  if (!db.ok) return db.response;

  const { id, notify, ...fields } = body.value;

  const { data: before, error: beforeError } = await db.value
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (beforeError) return dbErrorResponse('admin_orders_lookup', beforeError);
  if (!before) return jsonError('주문을 찾을 수 없습니다.', 404);

  const { data: order, error } = await db.value
    .from('orders')
    .update(fields)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return dbErrorResponse('admin_orders_update', error);
  if (!order) return jsonError('주문을 찾을 수 없습니다.', 404);

  let email: 'sent' | 'failed' | 'skipped' = 'skipped';
  const becameShipped = fields.status === 'shipped' && before.status !== 'shipped';
  if (becameShipped && notify !== false && order.tracking_number) {
    try {
      await sendEmails([
        buildShippingEmail(order as EmailOrder, {
          carrier: order.tracking_carrier ?? null,
          trackingNumber: order.tracking_number,
        }),
      ]);
      email = 'sent';
      log.info('admin_orders_shipping_email', { id });
    } catch (emailError) {
      email = 'failed';
      log.error('admin_orders_shipping_email', emailError);
    }
  }

  return NextResponse.json({ ok: true, order, email });
}
