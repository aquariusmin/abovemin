import { NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

const SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD!;

function signToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8시간
  const payload = `${nonce}:${expires}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [nonce, expiresStr, sig] = parts;
  const expires = Number(expiresStr);
  if (Date.now() > expires) return false;
  const expected = createHmac('sha256', SECRET).update(`${nonce}:${expiresStr}`).digest('hex');
  if (sig.length !== expected.length) return false;
  // timing-safe comparison
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }));

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = signToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
    sameSite: 'strict',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('admin_session');
  return response;
}
