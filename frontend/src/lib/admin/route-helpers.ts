import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';
import { isMissingColumnError } from '@/lib/db-compat';
import { firstIssue } from './schemas';

/**
 * 관리 API 라우트의 공통 관문. **서버 전용.**
 *
 * 기존 라우트(`api/admin/photos` 등)는 같은 여섯 줄 — origin 확인, 세션 확인,
 * DB 클라이언트, 본문 파싱 — 을 라우트마다 손으로 적었다. 라우트가 열 개를
 * 넘으면 그중 하나는 반드시 한 줄을 빠뜨린다. 새 라우트는 이 파일을 거친다.
 *
 * 순서는 기존과 같다: 변경 요청은 origin을 먼저 본다(쿠키가 실린 교차 출처
 * 요청을 세션 조회 전에 끊는다).
 */

export type Guarded<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export function jsonError(error: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

/** 읽기 요청: 세션만 본다. */
export async function guardRead(): Promise<NextResponse | null> {
  if (!(await isAdminRequest())) return jsonError('Unauthorized', 401);
  return null;
}

/** 변경 요청: 같은 출처 + 세션. 둘 다 통과해야 한다. */
export async function guardMutation(request: Request): Promise<NextResponse | null> {
  if (!assertSameOrigin(request)) return jsonError('Bad origin', 403);
  if (!(await isAdminRequest())) return jsonError('Unauthorized', 401);
  return null;
}

export function adminDb(label: string): Guarded<SupabaseClient> {
  try {
    return { ok: true, value: getSupabaseAdmin() };
  } catch (error) {
    log.error(`${label}_config`, error);
    return { ok: false, response: jsonError('Admin database is not configured', 503) };
  }
}

/** 본문을 zod로 검증한다. 실패하면 첫 이슈의 한국어 메시지로 400. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Guarded<z.output<S>>> {
  const raw = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: jsonError(firstIssue(parsed.error), 400) };
  }
  return { ok: true, value: parsed.data };
}

export const MIGRATION_NOTICE =
  '마이그레이션 적용 필요 — supabase/migrations/20260916000000_admin_studio.sql을 먼저 적용해 주세요.';

/**
 * DB 오류 → 응답. 컬럼이 없어서 난 오류면 409 + `migration: true`로 구분한다 —
 * 관리 화면은 그걸 보고 "다시 시도"가 아니라 "마이그레이션 적용 필요"를 띄운다.
 */
export function dbErrorResponse(label: string, error: unknown): NextResponse {
  if (isMissingColumnError(error)) {
    log.warn(`${label}.migration_pending`, error);
    return jsonError(MIGRATION_NOTICE, 409, { migration: true });
  }
  log.error(label, error);
  return jsonError('DB error', 500);
}

/** Postgres 오류 코드. 고유 제약(23505)·FK(23503)를 사람 말로 바꾸는 데 쓴다. */
export function pgCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * PostgREST는 트랜잭션을 열 수 없어 행마다 값이 다른 update는 행마다 보낸다.
 * 동시에 너무 많이 열지 않도록 묶어서 보내고, 첫 실패에서 멈춘다.
 */
export async function runChunked<T>(
  items: readonly T[],
  chunk: number,
  run: (item: T) => PromiseLike<{ error: unknown }>,
): Promise<{ error: unknown } | null> {
  for (let i = 0; i < items.length; i += chunk) {
    const results = await Promise.all(items.slice(i, i + chunk).map(run));
    const failed = results.find(result => result.error);
    if (failed) return failed;
  }
  return null;
}
