import 'server-only';
import { Resend } from 'resend';
import { orderItemLabel, type OrderItemRecord } from './order-items';
import type { EmailOutcome } from './order-email-status';
import { DELIVERY_LABEL, deliveryMethodFromRow } from './delivery';

// 모든 고객 입력은 `escapeHtml`을 거친다 — 관리자 메일함에서 스크립트가 실행되면 안 된다.
// 기본값을 두지 않는다 — 환경변수가 빠진 배포에서 고객 정보가 엉뚱한 주소로 나가지 않게.
export const OWNER_EMAIL: string | null = process.env.OWNER_EMAIL?.trim() || null;
export const FROM_EMAIL = process.env.FROM_EMAIL ?? 'phorage <noreply@abovemin.com>';
const BANK_INFO = process.env.BANK_INFO ?? '(계좌 정보 미설정 — 관리자에게 문의)';

// 미설정이면 `null` — 자리표시 문구를 계좌처럼 보여 주지 않는다. 계좌는 env에서만 온다.
export function configuredBankInfo(value: string | undefined = process.env.BANK_INFO): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type EmailOrderItem = OrderItemRecord;

export interface EmailOrder {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  delivery_method?: string | null;
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

// 제목은 평문이라 escapeHtml 대신 줄바꿈·제어 문자를 지운다(개행은 헤더를 끊는다).
export function subjectText(s: string, max = 60): string {
  const flat = s
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export type EmailableOrder = EmailOrder & { email: string };

export function hasBuyerEmail<T extends { email?: string | null }>(order: T): order is T & { email: string } {
  return typeof order.email === 'string' && order.email.trim() !== '';
}

export function buildBuyerEmail(order: EmailableOrder): EmailMessage {
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
        주문 번호 <strong>#${orderId}</strong>로 주문을 받았습니다.
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
        입금이 확인되면 발송합니다. 궁금한 점은 이 메일에 답장해 주세요.
      </p>
      <div style="border-top:1px solid #eee;margin-top:40px;padding-top:20px;">
        <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#bbb;margin:0;">phorage studio · collecting the winter light</p>
      </div>
    </div>
  `;

  return { to: order.email, subject: `[phorage] 주문 접수 확인 — #${orderId}`, html };
}

export function buildOwnerEmail(order: EmailOrder, to: string): EmailMessage {
  const safeName = escapeHtml(order.name);
  const safeEmail = escapeHtml(order.email ?? '');
  const safePhone = escapeHtml(order.phone || '-');
  const method = deliveryMethodFromRow(order);
  const safeAddress = escapeHtml(order.zipcode ? `[${order.zipcode}] ${order.address}` : order.address);
  const safeNote = escapeHtml(order.note || '-');
  const { id: orderId, total_price } = order;

  const html = `
    <div style="font-family:monospace;max-width:560px;margin:0 auto;color:#333;">
      <h2 style="font-size:16px;">새 주문 #${orderId}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 8px;color:#999;">이름</td><td style="padding:4px 8px;">${safeName}</td></tr>
        ${order.email ? `<tr><td style="padding:4px 8px;color:#999;">이메일</td><td style="padding:4px 8px;">${safeEmail}</td></tr>` : ''}
        <tr><td style="padding:4px 8px;color:#999;">연락처</td><td style="padding:4px 8px;">${safePhone}</td></tr>
        <tr><td style="padding:4px 8px;color:#999;">수령</td><td style="padding:4px 8px;font-weight:bold;">${DELIVERY_LABEL[method]}</td></tr>
        ${method === 'parcel' ? `<tr><td style="padding:4px 8px;color:#999;">주소</td><td style="padding:4px 8px;">${safeAddress}</td></tr>` : ''}
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

export function buildShippingEmail(order: EmailableOrder, shipping: ShippingInfo): EmailMessage {
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
        택배사 조회는 반나절쯤 지나야 될 수 있습니다. 궁금한 점은 이 메일에 답장해 주세요.
      </p>
      <div style="border-top:1px solid #eee;margin-top:40px;padding-top:20px;">
        <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#bbb;margin:0;">phorage studio · collecting the winter light</p>
      </div>
    </div>
  `;

  return { to: order.email, subject: `[phorage] 배송 시작 안내 — #${order.id}`, html };
}

export type EmailSender = (message: EmailMessage) => Promise<{ error?: { message: string } | null }>;

function resendSender(): EmailSender {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return message => resend.emails.send({ from: FROM_EMAIL, ...message });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 한 통씩 따로 보내고 순서대로 결과를 돌려준다. 던지지 않는다.
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
    // Resend SDK는 실패를 throw하지 않고 `{ error }`로 돌려준다 — 반드시 확인한다.
    const error = result.value?.error;
    return error ? { ok: false, error: error.message } : { ok: true };
  });
}

export async function sendEmailsOrThrow(messages: EmailMessage[], send?: EmailSender): Promise<void> {
  const outcomes = await sendEmails(messages, send);
  const failed = outcomes.find(outcome => !outcome.ok);
  if (failed && !failed.ok) throw new Error(failed.error);
}
