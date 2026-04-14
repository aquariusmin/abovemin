import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@phorage.com';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'phorage <noreply@phorage.com>';
const BANK_INFO = process.env.BANK_INFO ?? '(계좌 정보 미설정 — 관리자에게 문의)';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  let body: {
    name: string;
    email: string;
    phone?: string;
    address: string;
    note?: string;
    items: OrderItem[];
    total_price: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, phone, address, note, items, total_price } = body;

  if (!name || !email || !address || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. Supabase에 주문 저장
  const { data: order, error: dbError } = await supabase
    .from('orders')
    .insert({ name, email, phone: phone || null, address, note: note || null, items, total_price })
    .select('id')
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }

  const orderId = order.id;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || '-');
  const safeAddress = escapeHtml(address);
  const safeNote = escapeHtml(note || '-');

  const itemRows = items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${escapeHtml(i.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">×${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">₩ ${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`)
    .join('');

  // 2. 구매자 확인 이메일
  const buyerHtml = `
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
        <p style="font-size:15px;font-weight:bold;color:#333;margin:0 0 6px;">${BANK_INFO}</p>
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

  // 3. 점주 알림 이메일
  const ownerHtml = `
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
      <p style="font-size:12px;color:#999;margin-top:16px;">상품: ${items.map(i => `${escapeHtml(i.name)} ×${i.quantity}`).join(', ')}</p>
    </div>
  `;

  // 이메일 발송 (실패해도 주문은 유지)
  try {
    await Promise.all([
      resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `[phorage] 주문 접수 확인 — #${orderId}`,
        html: buyerHtml,
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `[phorage] 새 주문 #${orderId} — ${safeName} / ₩${total_price.toLocaleString()}`,
        html: ownerHtml,
      }),
    ]);
  } catch (emailErr) {
    console.error('Email send error:', emailErr);
    // 이메일 실패는 주문 성공에 영향 안 줌
  }

  return NextResponse.json({ success: true, orderId });
}
