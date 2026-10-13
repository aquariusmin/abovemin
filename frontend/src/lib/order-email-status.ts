import { withColumnFallback } from './db-compat';

/**
 * 주문 메일이 실제로 나갔는지의 기록 — `orders.buyer_email_sent_at`,
 * `orders.owner_email_sent_at`(`20261014000000_order_email_status.sql`).
 *
 * 주문 메일은 응답 뒤에 나가고 실패해도 주문은 남는다. 그 실패가 로그에만
 * 있으면 손님은 계좌를 못 받고 운영자는 주문이 온 줄 모른다. 여기서는 "무엇을
 * 적을지"와 "무엇을 미발송으로 볼지"를 순수 함수로 두고, 주문 라우트·관리
 * 재발송·관리 화면이 같이 쓴다. 서버 전용 모듈을 끌어오지 않는다 — 관리
 * 화면(클라이언트)이 import한다.
 */

export type OrderEmailKind = 'buyer' | 'owner';

/** 메일 한 통의 결과. `sendEmails`가 보낸 순서대로 돌려준다. */
export type EmailOutcome = { ok: true } | { ok: false; error: string };

export interface EmailSentPatch {
  buyer_email_sent_at?: string;
  owner_email_sent_at?: string;
}

const COLUMN: Record<OrderEmailKind, keyof EmailSentPatch> = {
  buyer: 'buyer_email_sent_at',
  owner: 'owner_email_sent_at',
};

/**
 * 어느 시각을 적을지. **나간 메일만** 적는다.
 *
 * `kinds[i]`는 `outcomes[i]`가 어느 메일인지다. 시도하지 않은 메일(전체 한도에
 * 걸린 손님 메일, 주소가 없는 운영자 알림)은 `kinds`에 없으므로 null로 남는다.
 * 결과가 모자라게 돌아온 자리도 실패로 본다 — 모르는 것을 "보냈다"로 적지 않는다.
 */
export function emailSentPatch(
  kinds: readonly OrderEmailKind[],
  outcomes: readonly EmailOutcome[],
  sentAt: string,
): EmailSentPatch {
  const patch: EmailSentPatch = {};
  kinds.forEach((kind, i) => {
    if (outcomes[i]?.ok) patch[COLUMN[kind]] = sentAt;
  });
  return patch;
}

/** `recordEmailSent`가 쓰는 만큼의 DB 모양. 테스트가 가짜를 넣을 수 있게 좁혔다. */
export interface OrderUpdater {
  from(table: 'orders'): {
    update(values: EmailSentPatch): {
      eq(column: 'id', value: number): PromiseLike<{ error: unknown }>;
    };
  };
}

export type RecordResult = 'recorded' | 'nothing' | 'migration_pending' | 'failed';

/**
 * 시각을 주문 행에 적는다. **던지지 않는다** — 이 기록 때문에 주문이나 재발송이
 * 실패하면 안 된다. 실패는 결과로 돌려주고, 로그는 호출부가 남긴다.
 *
 * 컬럼이 아직 없으면(코드가 마이그레이션보다 먼저 배포된 경우) 적지 않고
 * `migration_pending`으로 답한다. `withColumnFallback`의 fallback이 "아무것도
 * 안 함"인 이유: 두 컬럼은 한 파일이 같이 만들므로, 하나만 빼고 다시 보낼
 * 것이 없다.
 */
export async function recordEmailSent(db: OrderUpdater, orderId: number, patch: EmailSentPatch): Promise<RecordResult> {
  if (Object.keys(patch).length === 0) return 'nothing';
  try {
    const { error, migrationPending } = await withColumnFallback<{ error: unknown }>(
      'orders.email_status',
      () => db.from('orders').update(patch).eq('id', orderId),
      async () => ({ error: null }),
    );
    if (migrationPending) return 'migration_pending';
    return error ? 'failed' : 'recorded';
  } catch {
    return 'failed';
  }
}

/** 관리 화면이 보는 주문의 일부. 컬럼이 없으면 두 필드는 `undefined`다. */
export interface EmailStatusRow {
  created_at: string;
  buyer_email_sent_at?: string | null;
  owner_email_sent_at?: string | null;
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * 기록이 시작된 시각(ms): 모든 주문의 두 컬럼을 통틀어 **가장 이른 값**.
 * 하나도 없으면 null — 컬럼이 없거나, 적용 뒤 아직 한 통도 기록되지 않았다.
 *
 * 마이그레이션에 backfill이 없으므로 이 값은 "컬럼도 있고 기록하는 코드도
 * 돌고 있었다"가 처음 증명된 순간이다. 주문의 `created_at`이 아니라 **적힌
 * 시각**을 쓰는 이유: 옛 주문의 메일을 관리 화면에서 다시 보내면 그 옛 주문에
 * 시각이 적힌다. `created_at`으로 재면 그 주문 뒤의 옛 주문들이 전부 미발송이
 * 된다. 적힌 시각은 언제나 적용 이후다.
 */
export function emailTrackingStart(orders: readonly EmailStatusRow[]): number | null {
  let start: number | null = null;
  for (const order of orders) {
    for (const value of [order.buyer_email_sent_at, order.owner_email_sent_at]) {
      const ms = time(value);
      if (ms !== null && (start === null || ms < start)) start = ms;
    }
  }
  return start;
}

/**
 * 이 주문에 "메일 미발송"을 붙일지. 입금 안내가 기록되지 않았고(null), **그
 * null이 "모른다"가 아닌 것이 확실할 때만** 참이다.
 *
 *  - 운영자 알림 시각이 있다: 이 주문에서 기록이 돌았다. 그런데 손님 쪽이
 *    비었으면 실패했거나 한도에 걸린 것이다.
 *  - 기록이 시작된 뒤에 들어온 주문이다(`emailTrackingStart`).
 *
 * 옛 주문은 둘 다 아니므로 절대 표시되지 않는다. 대가는 반대쪽이다: 적용
 * 직후부터 첫 기록이 생기기 전까지 두 통이 다 실패한 주문은 표시되지 않는다.
 */
export function isBuyerEmailMissing(order: EmailStatusRow, trackingStart: number | null): boolean {
  if (order.buyer_email_sent_at) return false;
  if (order.owner_email_sent_at) return true;
  if (trackingStart === null) return false;
  const created = time(order.created_at);
  return created !== null && created >= trackingStart;
}
