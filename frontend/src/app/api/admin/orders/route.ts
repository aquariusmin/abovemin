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

  // `shipped`로 바꾸는 요청은 "아직 shipped가 아닌 행만" 고치는 조건부 update로
  // 먼저 보낸다. 행이 돌아오면 이 요청이 상태를 **바꾼** 것이고, 메일은 그때만
  // 나간다. 예전에는 상태를 먼저 읽고 따로 update했는데, 버튼을 두 번 누르거나
  // 탭 두 개에서 동시에 저장하면 둘 다 "아직 shipped 아님"을 읽어 배송 안내가
  // 두 통 나갔다. 조건을 update의 WHERE에 두면 Postgres가 행 잠금 뒤 조건을
  // 다시 보므로, 동시에 와도 한쪽만 행을 받는다.
  //
  // `status is null`도 넣는 이유: `neq`는 null을 걸러낸다(null <> 'shipped'는
  // null). 상태가 비어 있는 옛 행도 "아직 안 보냄"이다.
  const update = () => db.value.from('orders').update(fields).eq('id', id);

  const transition =
    fields.status === 'shipped'
      ? await update().or('status.is.null,status.neq.shipped').select('*').maybeSingle()
      : null;
  if (transition?.error) return dbErrorResponse('admin_orders_update', transition.error);
  const becameShipped = Boolean(transition?.data);

  // 상태를 바꾸지 않는 요청, 또는 이미 shipped였던 주문(메모·송장만 고침).
  const { data: order, error } = becameShipped ? transition! : await update().select('*').maybeSingle();
  if (error) return dbErrorResponse('admin_orders_update', error);
  if (!order) return jsonError('주문을 찾을 수 없습니다.', 404);

  let email: 'sent' | 'failed' | 'skipped' = 'skipped';
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
