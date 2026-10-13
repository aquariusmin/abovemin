import 'server-only';
import { Resend } from 'resend';
import { orderItemLabel, type OrderItemRecord } from './order-items';
import type { EmailOutcome } from './order-email-status';

/**
 * 주문 메일 본문. **주문 접수(`api/orders`)와 관리 화면의 재발송이 같은 함수를
 * 쓴다.**
 *
 * 예전에는 HTML이 주문 라우트 안에 문자열로 박혀 있었다. 관리 화면에서 "안내
 * 메일 다시 보내기"를 만들려면 그걸 복사해야 했고, 복사본은 반드시 어긋난다 —
 * 계좌 안내 문구를 한쪽만 고치면 재발송 메일만 옛 계좌를 안내한다.
 *
 * 모든 고객 입력은 `escapeHtml`을 거친다. 이름에 `<img onerror=…>`를 넣은
 * 주문이 관리자 메일함에서 실행되면 안 된다.
 */

/**
 * 운영자 알림을 받는 주소. **기본값을 두지 않는다.**
 *
 * 예전에는 `?? 'owner@phorage.com'`이었다. 환경변수가 빠진 배포(프리뷰, 프로젝트
 * 이전, 복원 직후)에서는 손님 이름·연락처·주소가 든 알림이 오류 하나 없이 그
 * 주소로 나갔을 것이다. 없으면 보내지 않고, 호출부가 로그로 알린다.
 */
export const OWNER_EMAIL: string | null = process.env.OWNER_EMAIL?.trim() || null;
export const FROM_EMAIL = process.env.FROM_EMAIL ?? 'phorage <noreply@abovemin.com>';
const BANK_INFO = process.env.BANK_INFO ?? '(계좌 정보 미설정 — 관리자에게 문의)';

/**
 * 주문 완료 화면에 보여 줄 계좌 정보. 메일과 같은 환경변수에서 오지만, 설정되지
 * 않았을 때는 위의 자리표시 문구가 아니라 `null`이다 — 화면은 "메일을
 * 확인해주세요"로 안내하고, 손님에게 "미설정"을 계좌처럼 보여 주지 않는다.
 */
export function configuredBankInfo(value: string | undefined = process.env.BANK_INFO): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * 옵션을 고른 줄은 `option_label`을 함께 적는다("포스터 · A3 · 매트지"). 옵션
 * 이전의 주문(키 자체가 없음)은 이름만 — 관리 화면의 재발송이 옛 주문도 보낸다.
 */
export type EmailOrderItem = OrderItemRecord;

export interface EmailOrder {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  zipcode: string | null;
  address: string;
  note: string | null;
  items: EmailOrderItem[];
  total_price: number;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 메일 **제목**에 들어갈 고객 입력. 제목은 HTML이 아니라 평문이라 `escapeHtml`을
 * 거치면 "Kim &amp; Lee"가 그대로 보인다. 대신 줄바꿈·제어 문자를 지운다 —
 * 제목에 들어간 개행은 헤더를 끊고, 보이지 않는 문자는 알림 목록을 어지럽힌다.
 * 길이도 자른다: 이름 칸은 100자까지 받지만 제목에 다 들어갈 필요는 없다.
 */
export function subjectText(s: string, max = 60): string {
  const flat = s
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** 고객에게 가는 주문 접수 확인(입금 안내 포함). */
export function buildBuyerEmail(order: EmailOrder): EmailMessage {
  const safeName = escapeHtml(order.name);
  const { id: orderId, total_price } = order;

  const itemRows = order.items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${escapeHtml(orderItemLabel(i))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">×${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">₩ ${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`)
    .join('');

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#333;">
      <div style="border-bottom:2px solid #4A5D4E;padding-bottom:24px;margin-bottom:32px;">
        <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;margin:0 0 8px;">phorage studio</p>
        <h1 style="font-size:28px;font-weight:300;font-style:italic;margin:0;">주문이 접수되었습니다.</h1>
      </div>
      <p style="font-size:14px;line-height:1.8;color:#555;">
        안녕하세요, <strong>${safeName}</strong>님.<br>
        주문 번호 <strong>#${orderId}</strong>이 정상적으로 접수되었습니다.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <thead>
          <tr style="border-bottom:2px solid #4A5D4E;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;color:#999;font-weight:normal;">상품</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;letter-spacing:0.1em;color:#999;font-weight:normal;">수량</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;letter-spacing:0.1em;color:#999;font-weight:normal;">금액</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:16px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Total</td>
            <td style="padding:16px 12px;text-align:right;font-size:20px;font-weight:bold;color:#4A5D4E;">₩ ${total_price.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
      <div style="background:#f7f5f0;padding:20px 24px;margin:32px 0;border-left:3px solid #4A5D4E;">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin:0 0 12px;">입금 안내</p>
        <p style="font-size:15px;font-weight:bold;color:#333;margin:0 0 6px;">${escapeHtml(BANK_INFO)}</p>
        <p style="font-size:13px;color:#555;margin:0;">입금자명: <strong>${safeName}</strong> / 금액: <strong>₩ ${total_price.toLocaleString()}</strong></p>
      </div>
      <p style="font-size:13px;color:#888;line-height:1.8;">
        입금 확인 후 배송이 시작됩니다. 문의사항은 이 이메일로 회신해주세요.
      </p>
      <div style="border-top:1px solid #eee;margin-top:40px;padding-top:20px;">
        <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#bbb;margin:0;">phorage studio · collecting the greenery</p>
      </div>
    </div>
  `;

  return { to: order.email, subject: `[phorage] 주문 접수 확인 — #${orderId}`, html };
}

/** 운영자에게 가는 새 주문 알림. 받는 주소는 호출부가 `OWNER_EMAIL`을 확인해 넘긴다. */
export function buildOwnerEmail(order: EmailOrder, to: string): EmailMessage {
  const safeName = escapeHtml(order.name);
  const safeEmail = escapeHtml(order.email);
  const safePhone = escapeHtml(order.phone || '-');
  // One line, the way it goes on a shipping label: `[12345] 서울시 …`. The zip
  // is optional on the form, so an order without one reads as a plain address
  // rather than an empty bracket.
  const safeAddress = escapeHtml(order.zipcode ? `[${order.zipcode}] ${order.address}` : order.address);
  const safeNote = escapeHtml(order.note || '-');
  const { id: orderId, total_price } = order;

  const html = `
    <div style="font-family:monospace;max-width:560px;margin:0 auto;color:#333;">
      <h2 style="font-size:16px;">새 주문 #${orderId}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 8px;color:#999;">이름</td><td style="padding:4px 8px;">${safeName}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">이메일</td><td style="padding:4px 8px;">${safeEmail}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">연락처</td><td style="padding:4px 8px;">${safePhone}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">주소</td><td style="padding:4px 8px;">${safeAddress}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">메모</td><td style="padding:4px 8px;">${safeNote}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">총액</td><td style="padding:4px 8px;font-weight:bold;">₩ ${total_price.toLocaleString()}</td></tr>
      </table>
      <p style="font-size:12px;color:#999;margin-top:16px;">상품: ${order.items.map(i => `${escapeHtml(orderItemLabel(i))} ×${i.quantity}`).join(', ')}</p>
    </div>
  `;

  return {
    to,
    subject: `[phorage] 새 주문 #${orderId} — ${subjectText(order.name)} / ₩${total_price.toLocaleString()}`,
    html,
  };
}

export interface ShippingInfo {
  carrier: string | null;
  trackingNumber: string;
}

/** 고객에게 가는 배송 시작 안내. 관리 화면에서 `shipped`로 바꿀 때 보낸다. */
export function buildShippingEmail(order: EmailOrder, shipping: ShippingInfo): EmailMessage {
  const safeName = escapeHtml(order.name);
  const safeCarrier = escapeHtml(shipping.carrier || '택배');
  const safeTracking = escapeHtml(shipping.trackingNumber);
  const safeAddress = escapeHtml(order.zipcode ? `[${order.zipcode}] ${order.address}` : order.address);

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#333;">
      <div style="border-bottom:2px solid #4A5D4E;padding-bottom:24px;margin-bottom:32px;">
        <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;margin:0 0 8px;">phorage studio</p>
        <h1 style="font-size:28px;font-weight:300;font-style:italic;margin:0;">배송이 시작되었습니다.</h1>
      </div>
      <p style="font-size:14px;line-height:1.8;color:#555;">
        안녕하세요, <strong>${safeName}</strong>님.<br>
        주문 번호 <strong>#${order.id}</strong>의 상품을 발송했습니다.
      </p>
      <div style="background:#f7f5f0;padding:20px 24px;margin:32px 0;border-left:3px solid #4A5D4E;">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin:0 0 12px;">배송 정보</p>
        <p style="font-size:15px;font-weight:bold;color:#333;margin:0 0 6px;">${safeCarrier} · ${safeTracking}</p>
        <p style="font-size:13px;color:#555;margin:0;">받는 곳: ${safeAddress}</p>
      </div>
      <p style="font-size:13px;color:#888;line-height:1.8;">
        송장번호는 택배사 조회가 열리기까지 반나절쯤 걸릴 수 있습니다. 문의사항은 이 이메일로 회신해주세요.
      </p>
      <div style="border-top:1px solid #eee;margin-top:40px;padding-top:20px;">
        <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#bbb;margin:0;">phorage studio · collecting the greenery</p>
      </div>
    </div>
  `;

  return { to: order.email, subject: `[phorage] 배송 시작 안내 — #${order.id}`, html };
}

/** 메일 한 통을 보내는 함수. Resend SDK처럼 실패를 `{ error }`로 돌려줘도, 던져도 된다. */
export type EmailSender = (message: EmailMessage) => Promise<{ error?: { message: string } | null }>;

function resendSender(): EmailSender {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return message => resend.emails.send({ from: FROM_EMAIL, ...message });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 메일을 **한 통씩 따로** 보내고, 보낸 순서대로 결과를 돌려준다. 던지지 않는다.
 *
 * 예전에는 `Promise.all`이라 실패를 하나만 알렸다 — 손님 메일과 운영자 알림 중
 * 어느 쪽이 나갔는지 알 수 없었고, 그래서 기록할 수도 없었다
 * (`lib/order-email-status.ts`). 한 통이 실패해도 다른 한 통은 끝까지 간다.
 *
 * `send`는 테스트가 갈아 끼운다. 기본 sender를 만들다 실패하면(키 없음) 전부
 * 실패로 답한다.
 */
export async function sendEmails(messages: EmailMessage[], send?: EmailSender): Promise<EmailOutcome[]> {
  let sender: EmailSender;
  try {
    sender = send ?? resendSender();
  } catch (error) {
    return messages.map(() => ({ ok: false, error: errorText(error) }));
  }
  const settled = await Promise.allSettled(messages.map(async message => sender(message)));
  return settled.map(result => {
    if (result.status === 'rejected') return { ok: false, error: errorText(result.reason) };
    // Resend SDK는 실패를 throw하지 않고 `{ error }`로 돌려준다. 그걸 보지 않으면
    // "보냈습니다"라고 띄워 놓고 아무것도 안 간다.
    const error = result.value?.error;
    return error ? { ok: false, error: error.message } : { ok: true };
  });
}

/**
 * 하나라도 실패하면 던진다 — 관리 화면의 재발송과 배송 안내처럼 "보냈다/못
 * 보냈다"만 필요한 호출부용. 예전 `sendEmails`의 동작이다.
 */
export async function sendEmailsOrThrow(messages: EmailMessage[], send?: EmailSender): Promise<void> {
  const outcomes = await sendEmails(messages, send);
  const failed = outcomes.find(outcome => !outcome.ok);
  if (failed && !failed.ok) throw new Error(failed.error);
}
