import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

/**
 * 브라우저에서 터진 에러를 서버 로그로 옮긴다.
 *
 * 서버 렌더 에러는 Vercel 로그에 남지만, 에러 바운더리가 잡는 것들은 방문자의
 * 콘솔에만 찍히고 사라진다 — 사이트가 누군가에게 깨져 보여도 아무도 모른다.
 * 채용 담당자에게 URL을 건네는 사이트에서 가장 나쁜 실패 모드다.
 *
 * 외부 서비스를 붙이지 않은 이유: 서버 콘솔로 보내기만 하면 이미 Vercel의
 * 로그와 로그 드레인을 그대로 탄다. 나중에 Sentry를 붙이더라도 호출부는 그대로
 * 두고 이 파일 안만 바꾸면 된다.
 *
 * 공개 엔드포인트이므로 방어가 필요하다: 길이 제한, IP당 레이트 리밋, 그리고
 * 클라이언트가 보낸 것은 문자열로만 다룬다.
 */
const ClientError = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional().nullable(),
  /** 어디서 났는지. `location.pathname`만 받는다. */
  path: z.string().max(300).optional().nullable(),
  /** 루트 레이아웃까지 무너진 경우와 구분한다. */
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

  // 본문은 필요 없다.
  return new NextResponse(null, { status: 204 });
}
