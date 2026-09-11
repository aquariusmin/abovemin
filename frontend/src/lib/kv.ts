import { log } from './logger';

/**
 * 선택적 공유 저장소. 설정돼 있으면 쓰고, 없으면 없는 대로 동작한다.
 *
 * 레이트 리미터와 세션 무효화는 in-memory라, 서버리스에서는 인스턴스마다
 * 따로 센다 — "15분에 5회" 제한이 실제로는 "인스턴스당 5회"이고, 로그아웃한
 * 세션이 다른 인스턴스에서는 여전히 살아 있다. 두 파일의 주석 모두 Upstash를
 * 권했지만 그대로였다.
 *
 * SDK를 넣지 않고 REST를 직접 부르는 이유: Upstash REST는 토큰 하나를 붙인
 * HTTPS 요청이고, 이 저장소는 레이트 리미터도 로거도 직접 쓴 곳이다.
 * 의존성 하나보다 30줄이 낫다.
 *
 * ── 켜는 법 ────────────────────────────────────────────────────────────────
 * Vercel Marketplace에서 Upstash Redis를 붙이면 아래 두 변수가 들어온다.
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * 없으면 이 모듈의 모든 함수가 `null`을 돌려주고, 호출부는 기존의 in-memory
 * 경로를 그대로 탄다. 즉 **설정하지 않아도 아무것도 깨지지 않는다.**
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(URL_ && TOKEN);

/**
 * 명령 하나를 보낸다. 실패는 `null`로 삼킨다.
 *
 * 저장소가 죽었다고 로그인과 주문까지 죽어서는 안 된다. 그 경우 호출부는
 * in-memory로 되돌아가는데, 공유되지 않는 제한은 없는 제한보다 낫다.
 */
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

/**
 * 카운터를 1 올리고 현재 값을 돌려준다. 처음 만들어질 때만 만료를 건다.
 *
 * INCR과 EXPIRE를 파이프라인 하나로 보내므로 왕복이 한 번이다. 매번 EXPIRE를
 * 다시 걸면 창이 계속 밀려 영구 차단이 되므로, `NX`로 없을 때만 건다.
 */
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

/** 값 하나를 만료와 함께 저장한다. 성공했는지 여부를 돌려준다. */
export async function setWithTtl(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  return (await command<string>(['SET', key, value, 'EX', String(ttlSeconds)])) === 'OK';
}

/** 키가 있는지. 저장소가 없거나 실패하면 `null`(= 모름). */
export async function exists(key: string): Promise<boolean | null> {
  const n = await command<number>(['EXISTS', key]);
  return n === null ? null : n === 1;
}
