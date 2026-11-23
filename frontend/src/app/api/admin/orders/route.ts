import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { isMissingColumnError } from '@/lib/db-compat';
import { OrderUpdate } from '@/lib/admin/schemas';
import { buildShippingEmail, configuredBankInfo, hasBuyerEmail, sendEmailsOrThrow, type EmailOrder } from '@/lib/order-email';
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

  // 주문이 0건이면 새 컬럼 유무를 행으로 알 수 없어 한 컬럼만 따로 찔러 본다.
  const [list, probe, emailProbe] = await Promise.all([
    db.value.from('orders').select('*').order('created_at', { ascending: false }),
    db.value.from('orders').select('admin_memo').limit(1),
    // 메일 발송 기록(20261014000000_order_email_status)은 다른 마이그레이션이라 따로 본다.
    db.value.from('orders').select('buyer_email_sent_at').limit(1),
  ]);

  if (list.error) return dbErrorResponse('admin_orders_fetch', list.error);
  if (probe.error && !isMissingColumnError(probe.error)) log.warn('admin_orders_probe', probe.error);
  if (emailProbe.error && !isMissingColumnError(emailProbe.error)) log.warn('admin_orders_email_probe', emailProbe.error);

  return NextResponse.json({
    orders: list.data ?? [],
    migrationPending: Boolean(probe.error && isMissingColumnError(probe.error)),
    emailStatusPending: Boolean(emailProbe.error && isMissingColumnError(emailProbe.error)),
    // 관리자 세션 뒤에서만 나가는 값이다(입금 안내 문자용).
    bankInfo: configuredBankInfo(),
  });
}

export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, OrderUpdate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_orders');
  if (!db.ok) return db.response;

  const { id, notify, ...fields } = body.value;

  // 조건부 update(아직 shipped 아님 또는 null)라 동시 저장에도 배송 메일은 한 번만 나간다.
  const update = () => db.value.from('orders').update(fields).eq('id', id);

  const transition =
    fields.status === 'shipped'
      ? await update().or('status.is.null,status.neq.shipped').select('*').maybeSingle()
      : null;
  if (transition?.error) return dbErrorResponse('admin_orders_update', transition.error);
  const becameShipped = Boolean(transition?.data);

  const { data: order, error } = becameShipped ? transition! : await update().select('*').maybeSingle();
  if (error) return dbErrorResponse('admin_orders_update', error);
  if (!order) return jsonError('주문을 찾을 수 없습니다.', 404);

  let email: 'sent' | 'failed' | 'skipped' = 'skipped';
  const target = order as EmailOrder;
  if (becameShipped && notify !== false && order.tracking_number && hasBuyerEmail(target)) {
    try {
      await sendEmailsOrThrow([
        buildShippingEmail(target, {
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
