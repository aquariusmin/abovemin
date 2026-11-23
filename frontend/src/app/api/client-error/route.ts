import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

// 공개 엔드포인트다: 길이 제한, IP당 레이트 리밋, 클라이언트 값은 문자열로만 다룬다.
const ClientError = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional().nullable(),
  path: z.string().max(300).optional().nullable(),
  scope: z.enum(['page', 'global']).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  // 한 사람이 무한 루프에 빠져도 로그를 채우지 못하게 한다.
  if (!rateLimit(`client-error:${ip}`, { limit: 20, windowMs: 5 * 60 * 1000 }).ok) {
    return new NextResponse(null, { status: 429 });
  }

  const parsed = ClientError.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const { message, digest, path, scope } = parsed.data;
  log.error('client_error', {
    scope: scope ?? 'page',
    message,
    // Next가 서버 로그에도 같은 digest를 적는다 — 두 쪽을 잇는 유일한 열쇠다.
    digest: digest ?? null,
    path: path ?? null,
    userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? null,
  });

  return new NextResponse(null, { status: 204 });
}
