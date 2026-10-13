import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmails, sendEmailsOrThrow, type EmailMessage, type EmailSender } from '@/lib/order-email';
import {
  emailSentPatch,
  emailTrackingStart,
  isBuyerEmailMissing,
  recordEmailSent,
  type EmailSentPatch,
  type OrderUpdater,
} from '@/lib/order-email-status';

/**
 * 이 파일이 지키는 것: 주문 메일이 안 나갔을 때 **그 사실이 남는다.** 그리고
 * 그 기록이 주문을 깨지 않는다 — 컬럼이 아직 없어도, DB가 던져도.
 *
 * 네트워크는 타지 않는다: `sendEmails`에는 sender를, `recordEmailSent`에는 가짜
 * DB를 넣는다.
 */

const buyer: EmailMessage = { to: 'buyer@example.com', subject: 'buyer', html: '<p>b</p>' };
const owner: EmailMessage = { to: 'owner@example.com', subject: 'owner', html: '<p>o</p>' };
const NOW = '2026-10-14T03:00:00.000Z';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendEmails — 한 통씩의 결과', () => {
  it('둘 다 나가면 둘 다 ok, 보낸 순서 그대로', async () => {
    const sent: string[] = [];
    const send: EmailSender = async message => {
      sent.push(message.to);
      return { error: null };
    };
    expect(await sendEmails([buyer, owner], send)).toEqual([{ ok: true }, { ok: true }]);
    expect(sent).toEqual([buyer.to, owner.to]);
  });

  it('Resend가 `{ error }`로 돌려준 실패를 그 메일의 실패로 적는다 — 다른 한 통은 나간다', async () => {
    const send: EmailSender = async message =>
      message.to === buyer.to ? { error: { message: 'API key is invalid' } } : { error: null };
    expect(await sendEmails([buyer, owner], send)).toEqual([{ ok: false, error: 'API key is invalid' }, { ok: true }]);
  });

  it('sender가 던져도(네트워크) 다른 메일을 막지 않고, 던지지도 않는다', async () => {
    const attempted: string[] = [];
    const send: EmailSender = async message => {
      attempted.push(message.to);
      if (message.to === owner.to) throw new Error('fetch failed');
      return {};
    };
    expect(await sendEmails([buyer, owner], send)).toEqual([{ ok: true }, { ok: false, error: 'fetch failed' }]);
    expect(attempted).toEqual([buyer.to, owner.to]);
  });

  it('둘 다 실패하면 둘 다 알린다 — 예전에는 하나만 보였다', async () => {
    const send: EmailSender = async message => ({ error: { message: `no ${message.subject}` } });
    expect(await sendEmails([buyer, owner], send)).toEqual([
      { ok: false, error: 'no buyer' },
      { ok: false, error: 'no owner' },
    ]);
  });

  it('보낼 것이 없으면 sender를 부르지 않는다', async () => {
    const send = vi.fn<EmailSender>();
    expect(await sendEmails([], send)).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('sendEmailsOrThrow — 관리 화면 재발송이 기대하는 예전 동작', () => {
  it('전부 나가면 조용히 끝난다', async () => {
    await expect(sendEmailsOrThrow([buyer], async () => ({ error: null }))).resolves.toBeUndefined();
  });

  it('하나라도 실패하면 그 메시지로 던진다', async () => {
    const send: EmailSender = async message => (message.to === owner.to ? { error: { message: 'rate limited' } } : {});
    await expect(sendEmailsOrThrow([buyer, owner], send)).rejects.toThrow('rate limited');
  });
});

describe('emailSentPatch — 어느 시각을 적을지', () => {
  it('둘 다 나갔으면 둘 다 적는다', () => {
    expect(emailSentPatch(['buyer', 'owner'], [{ ok: true }, { ok: true }], NOW)).toEqual({
      buyer_email_sent_at: NOW,
      owner_email_sent_at: NOW,
    });
  });

  it('나간 쪽만 적는다', () => {
    expect(emailSentPatch(['buyer', 'owner'], [{ ok: false, error: 'x' }, { ok: true }], NOW)).toEqual({
      owner_email_sent_at: NOW,
    });
    expect(emailSentPatch(['buyer', 'owner'], [{ ok: true }, { ok: false, error: 'x' }], NOW)).toEqual({
      buyer_email_sent_at: NOW,
    });
  });

  it('전체 한도에 걸려 손님 메일을 건너뛰었으면 손님 쪽은 비어 있다', () => {
    // 운영자 알림만 시도했다: 결과의 0번은 운영자 것이지 손님 것이 아니다.
    expect(emailSentPatch(['owner'], [{ ok: true }], NOW)).toEqual({ owner_email_sent_at: NOW });
  });

  it('둘 다 실패했거나 시도한 것이 없으면 적을 것이 없다', () => {
    expect(emailSentPatch(['buyer', 'owner'], [{ ok: false, error: 'a' }, { ok: false, error: 'b' }], NOW)).toEqual({});
    expect(emailSentPatch([], [], NOW)).toEqual({});
  });

  it('결과가 모자라게 돌아온 자리는 보냈다고 적지 않는다', () => {
    expect(emailSentPatch(['buyer', 'owner'], [{ ok: true }], NOW)).toEqual({ buyer_email_sent_at: NOW });
  });
});

/** `db.from('orders').update(patch).eq('id', id)`만 받는 가짜. 부른 내용을 남긴다. */
function fakeDb(result: { error: unknown } | (() => never)) {
  const calls: Array<{ table: string; values: EmailSentPatch; column: string; id: number }> = [];
  const db: OrderUpdater = {
    from: table => ({
      update: values => ({
        eq: async (column, id) => {
          calls.push({ table, values, column, id });
          return typeof result === 'function' ? result() : result;
        },
      }),
    }),
  };
  return { db, calls };
}

describe('recordEmailSent — 기록은 주문을 깨지 않는다', () => {
  const patch = { buyer_email_sent_at: NOW };

  it('해당 주문 한 건에 그 값만 쓴다', async () => {
    const { db, calls } = fakeDb({ error: null });
    expect(await recordEmailSent(db, 41, patch)).toBe('recorded');
    expect(calls).toEqual([{ table: 'orders', values: patch, column: 'id', id: 41 }]);
  });

  it('적을 것이 없으면 DB를 건드리지 않는다', async () => {
    const { db, calls } = fakeDb({ error: null });
    expect(await recordEmailSent(db, 41, {})).toBe('nothing');
    expect(calls).toEqual([]);
  });

  it.each([
    ['PGRST204 — update 본문의 컬럼을 스키마 캐시가 모른다', { code: 'PGRST204', message: "Could not find the 'buyer_email_sent_at' column of 'orders' in the schema cache" }],
    ['42703 — undefined_column', { code: '42703', message: 'column orders.buyer_email_sent_at does not exist' }],
  ])('컬럼이 아직 없으면(%s) 던지지 않고, 다시 쓰지도 않는다', async (_label, error) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db, calls } = fakeDb({ error });
    expect(await recordEmailSent(db, 41, patch)).toBe('migration_pending');
    expect(calls).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('orders.email_status.migration_pending');
  });

  it('다른 DB 오류는 "마이그레이션 전"으로 뭉개지 않고 실패로 알린다', async () => {
    const { db } = fakeDb({ error: { code: '42501', message: 'permission denied for table orders' } });
    expect(await recordEmailSent(db, 41, patch)).toBe('failed');
  });

  it('DB 클라이언트가 던져도 밖으로 나가지 않는다', async () => {
    const { db } = fakeDb(() => {
      throw new Error('fetch failed');
    });
    await expect(recordEmailSent(db, 41, patch)).resolves.toBe('failed');
  });
});

describe('"메일 미발송" 표시 — 옛 주문은 절대 표시하지 않는다', () => {
  // 10-14 03:00에 기록이 시작됐다(가장 이른 적힌 시각).
  const tracked = { created_at: '2026-10-14T02:59:58+00:00', buyer_email_sent_at: NOW, owner_email_sent_at: NOW };
  const old = { created_at: '2026-09-20T10:00:00+00:00', buyer_email_sent_at: null, owner_email_sent_at: null };
  const failedAfter = { created_at: '2026-10-15T09:00:00+00:00', buyer_email_sent_at: null, owner_email_sent_at: null };

  it('컬럼이 없으면(필드가 undefined) 기록 시작 시각이 없고, 아무것도 표시하지 않는다', () => {
    const rows = [{ created_at: '2026-10-15T09:00:00+00:00' }, { created_at: '2026-09-20T10:00:00+00:00' }];
    expect(emailTrackingStart(rows)).toBeNull();
    expect(rows.some(row => isBuyerEmailMissing(row, emailTrackingStart(rows)))).toBe(false);
  });

  it('컬럼은 있지만 아직 한 통도 기록되지 않았으면 표시하지 않는다', () => {
    const rows = [old, failedAfter];
    expect(emailTrackingStart(rows)).toBeNull();
    expect(rows.some(row => isBuyerEmailMissing(row, null))).toBe(false);
  });

  it('기록 시작은 두 컬럼을 통틀어 가장 이른 적힌 시각이다', () => {
    const later = { created_at: '2026-10-16T00:00:00+00:00', buyer_email_sent_at: null, owner_email_sent_at: '2026-10-16T00:00:02.000Z' };
    expect(emailTrackingStart([later, tracked, old])).toBe(Date.parse(NOW));
  });

  it('기록이 시작된 뒤에 들어와 두 통 다 실패한 주문은 표시한다', () => {
    const start = emailTrackingStart([tracked, old, failedAfter]);
    expect(isBuyerEmailMissing(failedAfter, start)).toBe(true);
    expect(isBuyerEmailMissing(old, start)).toBe(false);
    expect(isBuyerEmailMissing(tracked, start)).toBe(false);
  });

  it('운영자 알림만 나간 주문은 기록 시작 시각과 무관하게 표시한다(손님 쪽 실패 또는 한도)', () => {
    const ownerOnly = { created_at: '2026-10-14T02:59:58+00:00', buyer_email_sent_at: null, owner_email_sent_at: NOW };
    // 이 주문이 첫 기록이다: created_at은 적힌 시각보다 2초 이르다.
    expect(isBuyerEmailMissing(ownerOnly, emailTrackingStart([ownerOnly, old]))).toBe(true);
  });

  it('옛 주문에 메일을 다시 보내 시각이 적혀도, 그 사이의 옛 주문들은 표시되지 않는다', () => {
    // 9-10 주문의 메일을 10-14에 재발송했다. created_at으로 재면 9-20 주문이 걸린다.
    const resentOld = { created_at: '2026-09-10T10:00:00+00:00', buyer_email_sent_at: NOW, owner_email_sent_at: null };
    const start = emailTrackingStart([resentOld, old]);
    expect(start).toBe(Date.parse(NOW));
    expect(isBuyerEmailMissing(old, start)).toBe(false);
    expect(isBuyerEmailMissing(resentOld, start)).toBe(false);
    expect(isBuyerEmailMissing(failedAfter, start)).toBe(true);
  });

  it('재발송으로 시각이 적히면 표시가 사라진다', () => {
    const start = Date.parse(NOW);
    expect(isBuyerEmailMissing({ ...failedAfter, buyer_email_sent_at: '2026-10-15T10:00:00.000Z' }, start)).toBe(false);
  });

  it('읽을 수 없는 날짜는 표시하지 않는 쪽으로 넘어간다', () => {
    expect(isBuyerEmailMissing({ created_at: 'not a date', buyer_email_sent_at: null }, Date.parse(NOW))).toBe(false);
    expect(emailTrackingStart([{ created_at: NOW, buyer_email_sent_at: 'garbage' }])).toBeNull();
  });
});
