import { withColumnFallback } from './db-compat';

// 클라이언트(관리 화면)도 import한다 — 서버 전용 모듈을 끌어오지 않는다.
export type OrderEmailKind = 'buyer' | 'owner';

export type EmailOutcome = { ok: true } | { ok: false; error: string };

export interface EmailSentPatch {
  buyer_email_sent_at?: string;
  owner_email_sent_at?: string;
}

const COLUMN: Record<OrderEmailKind, keyof EmailSentPatch> = {
  buyer: 'buyer_email_sent_at',
  owner: 'owner_email_sent_at',
};

// 나간 메일만 적는다. 결과가 모자란 자리는 실패로 본다 — 모르는 것을 "보냈다"로 적지 않는다.
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

export interface OrderUpdater {
  from(table: 'orders'): {
    update(values: EmailSentPatch): {
      eq(column: 'id', value: number): PromiseLike<{ error: unknown }>;
    };
  };
}

export type RecordResult = 'recorded' | 'nothing' | 'migration_pending' | 'failed';

// 던지지 않는다 — 이 기록 때문에 주문이 실패하면 안 된다. 컬럼이 없으면 `migration_pending`(order_email_status 대기).
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

export interface EmailStatusRow {
  created_at: string;
  /** 이메일 없이 받은 주문(null 또는 '')은 보낼 메일이 없으므로 미발송도 아니다. */
  email?: string | null;
  buyer_email_sent_at?: string | null;
  owner_email_sent_at?: string | null;
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

// 적힌 시각 중 가장 이른 값(backfill 없음). `created_at`이 아닌 이유: 옛 주문 재발송도 시각을 남긴다.
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

// "미발송"은 null이 "모른다"가 아닐 때만 참 — 기록 시작 전의 옛 주문은 표시하지 않는다.
export function isBuyerEmailMissing(order: EmailStatusRow, trackingStart: number | null): boolean {
  if (order.email !== undefined && !order.email?.trim()) return false;
  if (order.buyer_email_sent_at) return false;
  if (order.owner_email_sent_at) return true;
  if (trackingStart === null) return false;
  const created = time(order.created_at);
  return created !== null && created >= trackingStart;
}
