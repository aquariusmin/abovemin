import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCloudinaryConfig, type CloudinaryConfig } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { isMissingSchemaError } from '@/lib/db-compat';
import { firstIssue } from './schemas';
import { ADMIN_STUDIO_MIGRATION, ARCHIVE_EXTRAS_MIGRATION } from './limits';

// 서버 전용. 모든 관리 라우트가 거친다. 변경 요청은 세션 조회 전에 origin을 먼저 본다.

export type Guarded<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export function jsonError(error: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

// 읽기 요청: 세션만 본다.
export async function guardRead(): Promise<NextResponse | null> {
  if (!(await isAdminRequest())) return jsonError('Unauthorized', 401);
  return null;
}

// 변경 요청: 같은 출처 + 세션. 둘 다 통과해야 한다.
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

export const CLOUDINARY_NOT_CONFIGURED = 'Cloudinary is not configured';
// 화면에 그대로 보이는 문구라 나눠 둔 채로 둔다.
export const CLOUDINARY_UPLOAD_NOT_CONFIGURED = 'Cloudinary upload is not configured';

// 환경 변수가 빠졌으면 503.
export function adminCloudinary(
  label: string,
  message: string = CLOUDINARY_NOT_CONFIGURED,
): Guarded<CloudinaryConfig> {
  try {
    return { ok: true, value: getCloudinaryConfig() };
  } catch (error) {
    log.error(`${label}_cloudinary`, error);
    return { ok: false, response: jsonError(message, 503) };
  }
}

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

export { ADMIN_STUDIO_MIGRATION, ARCHIVE_EXTRAS_MIGRATION };

export function migrationNotice(file: string = ADMIN_STUDIO_MIGRATION): string {
  return `마이그레이션 적용 필요 — ${file}을 먼저 적용해 주세요.`;
}

export const MIGRATION_NOTICE = migrationNotice();

// 컬럼·테이블이 없어서 난 오류면 409 + migration: true — 화면이 "마이그레이션 적용 필요"를 띄운다.
export function dbErrorResponse(label: string, error: unknown, file: string = ADMIN_STUDIO_MIGRATION): NextResponse {
  if (isMissingSchemaError(error)) {
    log.warn(`${label}.migration_pending`, error);
    return jsonError(migrationNotice(file), 409, { migration: true });
  }
  log.error(label, error);
  return jsonError('DB error', 500);
}

export function pgCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

// PostgREST는 트랜잭션을 열 수 없다: 묶어서 보내고 첫 실패에서 멈춘다.
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
