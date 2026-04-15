// 최소 in-memory 레이트 리미터. 슬라이딩 윈도우 카운터.
// 서버리스에서 인스턴스별로 독립 카운팅됨 — 완전한 분산 제한이 필요하면
// Upstash Redis(Vercel Marketplace) 기반으로 교체 권장.

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

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
