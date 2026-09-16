import { Resend } from 'resend';

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

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@phorage.com';
export const FROM_EMAIL = process.env.FROM_EMAIL ?? 'phorage <noreply@abovemin.com>';
const BANK_INFO = process.env.BANK_INFO ?? '(계좌 정보 미설정 — 관리자에게 문의)';

export interface EmailOrderItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

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

/** 고객에게 가는 주문 접수 확인(입금 안내 포함). */
export function buildBuyerEmail(order: EmailOrder): EmailMessage {
  const safeName = escapeHtml(order.name);
  const { id: orderId, total_price } = order;

  const itemRows = order.items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${escapeHtml(i.name)}</td>
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

/** 운영자에게 가는 새 주문 알림. */
export function buildOwnerEmail(order: EmailOrder): EmailMessage {
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
      <p style="font-size:12px;color:#999;margin-top:16px;">상품: ${order.items.map(i => `${escapeHtml(i.name)} ×${i.quantity}`).join(', ')}</p>
    </div>
  `;

  return {
    to: OWNER_EMAIL,
    subject: `[phorage] 새 주문 #${orderId} — ${safeName} / ₩${total_price.toLocaleString()}`,
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

/** 메일 한 통 이상을 보낸다. 실패는 호출부가 결정한다(주문 접수는 삼키고, 재발송은 알린다). */
export async function sendEmails(messages: EmailMessage[]): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = await Promise.all(
    messages.map(message => resend.emails.send({ from: FROM_EMAIL, ...message })),
  );
  // Resend SDK는 실패를 throw하지 않고 `{ error }`로 돌려준다. 그걸 보지 않으면
  // "보냈습니다"라고 띄워 놓고 아무것도 안 간다.
  const failed = results.find(result => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
