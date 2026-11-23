import 'server-only';
import { log } from './logger';

// 선택적 Upstash REST 저장소. 미설정·실패 시 모든 함수가 `null` — 호출부가 다음 경로(Postgres/in-memory)를 탄다.
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(URL_ && TOKEN);

async function command<T>(args: (string | number)[]): Promise<T | null> {
  if (!URL_ || !TOKEN) return null;
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      // 인증 경로에 걸려 있으므로 절대 매달리면 안 된다.
      signal: AbortSignal.timeout(1_500),
      cache: 'no-store',
    });
    if (!res.ok) {
      log.warn('kv.http', { status: res.status });
      return null;
    }
    const body = (await res.json()) as { result?: T; error?: string };
    if (body.error) {
      log.warn('kv.error', body.error);
      return null;
    }
    return (body.result ?? null) as T | null;
  } catch (error) {
    log.warn('kv.unreachable', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// EXPIRE는 `NX`로 처음에만 건다 — 매번 걸면 창이 계속 밀려 영구 차단이 된다.
export async function incrementWithTtl(
  key: string,
  ttlSeconds: number,
): Promise<number | null> {
  if (!URL_ || !TOKEN) return null;
  try {
    const res = await fetch(`${URL_}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
      ]),
      signal: AbortSignal.timeout(1_500),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = body?.[0]?.result;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}
