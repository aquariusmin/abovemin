import { incrementWithTtl, kvEnabled } from './kv';
import { log } from './logger';
import { getSupabaseAdmin } from './supabase-admin';

// 최소 in-memory 레이트 리미터. 고정 윈도우 카운터.
//
// 인스턴스별로 독립 카운팅된다. 인스턴스를 넘는 제한이 필요한 곳은
// `rateLimitShared()`를 쓴다 — 공유 저장소를 아래 순서로 시도한다.
//   1. Upstash Redis   (UPSTASH_REDIS_REST_URL/TOKEN이 있을 때)
//   2. Supabase Postgres (`public.rate_limit_hit`, service role로 호출.
//      supabase/migrations/20260928000000_rate_limits.sql)
//   3. 이 파일의 in-memory 카운터
// 프로덕션에는 Upstash가 없으므로 실제로는 2번이 공유 경로다.

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
 * 공유 저장소 하나. `hit`은 1을 세고 결과를 돌려주거나, 저장소를 쓸 수 없으면
 * `null`을 돌려준다(던지지 않는다). `null`이면 다음 저장소로 넘어간다.
 */
interface SharedStore {
  name: string;
  hit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult | null>;
}

const upstashStore: SharedStore = {
  name: 'upstash',
  async hit(key, opts) {
    if (!kvEnabled) return null;
    const windowSec = Math.ceil(opts.windowMs / 1000);
    // 창을 시간으로 잘라 키에 넣는다. 이러면 만료를 따로 관리할 필요가 없고,
    // 같은 창 안의 요청이 같은 카운터를 본다.
    const bucket = Math.floor(Date.now() / opts.windowMs);
    const count = await incrementWithTtl(`rl:${key}:${bucket}`, windowSec);
    if (count === null) return null;
    return {
      ok: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
      resetAt: (bucket + 1) * opts.windowMs,
    };
  },
};

// 함수가 아직 없을 때(마이그레이션 전) 매 요청마다 왕복 한 번을 버리지 않도록
// 잠시 Postgres 경로를 건너뛴다. 적용 후에는 길어야 이만큼 뒤에 켜진다.
const PG_MISSING_BACKOFF_MS = 5 * 60 * 1000;
// 인증·주문 경로에 걸려 있으므로 절대 매달리면 안 된다(kv.ts와 같은 값).
const PG_TIMEOUT_MS = 1_500;

let pgSkipUntil = 0;
const pgWarned = new Set<string>();

function warnOnce(kind: string, meta: unknown) {
  if (pgWarned.has(kind)) return;
  pgWarned.add(kind);
  log.warn(`rate_limit.pg.${kind}`, meta);
}

/** `rate_limit_hit`이 없다는 오류. 마이그레이션이 아직 적용되지 않은 상태. */
function isMissingFunctionError(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  return typeof error.message === 'string' && /could not find the function/i.test(error.message);
}

type PgRow = { ok: boolean; remaining: number; reset_at: string };

const postgresStore: SharedStore = {
  name: 'postgres',
  async hit(key, opts) {
    if (Date.now() < pgSkipUntil) return null;
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (error) {
      // 로컬 개발처럼 service role 키가 없는 환경. 조용히 넘어간다.
      warnOnce('unconfigured', error instanceof Error ? error.message : String(error));
      return null;
    }
    try {
      const { data, error } = await supabase
        .rpc('rate_limit_hit', {
          p_key: key,
          p_window_ms: Math.max(1, Math.round(opts.windowMs)),
          p_limit: opts.limit,
        })
        .abortSignal(AbortSignal.timeout(PG_TIMEOUT_MS));
      if (error) {
        if (isMissingFunctionError(error)) {
          pgSkipUntil = Date.now() + PG_MISSING_BACKOFF_MS;
          warnOnce('migration_pending', { code: error.code, message: error.message });
        } else {
          warnOnce('error', { code: error.code, message: error.message });
        }
        return null;
      }
      const row = (Array.isArray(data) ? data[0] : data) as PgRow | null | undefined;
      const resetAt = row ? Date.parse(row.reset_at) : NaN;
      if (!row || typeof row.ok !== 'boolean' || Number.isNaN(resetAt)) {
        warnOnce('bad_response', data);
        return null;
      }
      return { ok: row.ok, remaining: Math.max(0, row.remaining), resetAt };
    } catch (error) {
      warnOnce('unreachable', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
};

const sharedStores: readonly SharedStore[] = [upstashStore, postgresStore];

/**
 * 공유 저장소로 센다. Upstash → Postgres → in-memory 순으로 시도한다.
 *
 * 서버리스에서 in-memory 카운터는 인스턴스마다 따로 돌아서, "15분에 5회"가
 * 실제로는 "인스턴스당 5회"다. 로그인 시도 제한과 주문 한도에서는 그 차이가
 * 의미가 있다.
 *
 * 저장소가 응답하지 않거나 오류를 내면(마이그레이션 전이라 함수가 없는 경우
 * 포함) 경고를 한 번 남기고 로컬 카운터로 내려간다 — 레이트 리미터가 죽었다고
 * 로그인이나 주문 자체가 막혀서는 안 되고, 공유되지 않는 제한이 없는 제한보다
 * 낫기 때문이다.
 */
export async function rateLimitShared(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  for (const store of sharedStores) {
    const result = await store.hit(key, opts);
    if (result) return result;
  }
  return rateLimit(key, opts);
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
