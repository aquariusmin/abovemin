import { incrementWithTtl, kvEnabled } from './kv';

// 최소 in-memory 레이트 리미터. 슬라이딩 윈도우 카운터.
//
// 인스턴스별로 독립 카운팅된다. 인스턴스를 넘는 제한이 필요한 곳은
// `rateLimitShared()`를 쓴다 — Upstash가 설정돼 있으면 그걸로 세고, 아니면
// 이 함수로 되돌아온다.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// 간단한 GC — 맵이 1000개 이상일 때만 만료된 항목 정리.
function gc() {
  if (buckets.size < 1000) return;
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  gc();
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt };
  }
  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return { ok, remaining: Math.max(0, opts.limit - existing.count), resetAt: existing.resetAt };
}

/**
 * 공유 저장소가 있으면 그걸로 세고, 없으면 위의 in-memory로 되돌아간다.
 *
 * 서버리스에서 in-memory 카운터는 인스턴스마다 따로 돌아서, "15분에 5회"가
 * 실제로는 "인스턴스당 5회"다. 로그인 시도 제한에서는 그 차이가 의미가 있다.
 *
 * 저장소가 응답하지 않으면 조용히 로컬 카운터로 내려간다 — 레이트 리미터가
 * 죽었다고 로그인 자체가 막혀서는 안 되고, 공유되지 않는 제한이 없는 제한보다
 * 낫기 때문이다.
 */
export async function rateLimitShared(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  if (!kvEnabled) return rateLimit(key, opts);

  const windowSec = Math.ceil(opts.windowMs / 1000);
  // 창을 시간으로 잘라 키에 넣는다. 이러면 만료를 따로 관리할 필요가 없고,
  // 같은 창 안의 요청이 같은 카운터를 본다.
  const bucket = Math.floor(Date.now() / opts.windowMs);
  const count = await incrementWithTtl(`rl:${key}:${bucket}`, windowSec);

  if (count === null) return rateLimit(key, opts);
  return {
    ok: count <= opts.limit,
    remaining: Math.max(0, opts.limit - count),
    resetAt: (bucket + 1) * opts.windowMs,
  };
}

export function clientIp(request: Request): string {
  // Prefer x-real-ip: on Vercel it's set by the edge to the true client IP and
  // is not client-spoofable, whereas a client can prepend to x-forwarded-for.
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}
