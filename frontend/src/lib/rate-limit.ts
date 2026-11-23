import 'server-only';
import { incrementWithTtl, kvEnabled } from './kv';
import { log } from './logger';
import { getSupabaseAdmin } from './supabase-admin';

// in-memory 카운터는 인스턴스별이다. 인스턴스를 넘는 제한은 `rateLimitShared()`(Upstash → Postgres → 메모리).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

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

// `hit`은 던지지 않는다. 저장소를 쓸 수 없으면 `null` — 다음 저장소로 넘어간다.
interface SharedStore {
  name: string;
  hit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult | null>;
}

const upstashStore: SharedStore = {
  name: 'upstash',
  async hit(key, opts) {
    if (!kvEnabled) return null;
    const windowSec = Math.ceil(opts.windowMs / 1000);
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

// 함수가 없을 때(20260928000000_rate_limits 전) 매 요청 왕복을 버리지 않도록 잠시 건너뛴다.
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

// 로그인·주문 한도는 반드시 이걸 쓴다. 저장소가 모두 실패하면 로컬 카운터로 내려간다(fail open).
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
  // x-real-ip 우선: Vercel 엣지가 설정해 위조 불가, x-forwarded-for는 클라이언트가 앞에 붙일 수 있다.
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}
