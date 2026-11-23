import { isMissingTableError } from '@/lib/db-compat';
import { log } from '@/lib/logger';

// 로그아웃한 관리자 세션을 모든 서버리스 인스턴스가 알도록 Supabase에 남긴다
// (`admin_revoked_sessions`, 20261123020000 마이그레이션). 테이블이 아직 없으면
// 예전처럼 인스턴스 메모리의 폐기 목록만 쓴다.

export const REVOKED_SESSIONS_TABLE = 'admin_revoked_sessions';

type Result = PromiseLike<{ data?: unknown; error: unknown }>;

export interface RevocationDb {
  from(table: typeof REVOKED_SESSIONS_TABLE): {
    upsert(row: { nonce: string; expires_at: string }): Result;
    delete(): { lt(column: 'expires_at', value: string): Result };
    select(columns: 'nonce'): { eq(column: 'nonce', value: string): { maybeSingle(): Result } };
  };
}

export async function recordRevocation(db: RevocationDb, nonce: string, expiresAt: number): Promise<void> {
  try {
    const { error } = await db.from(REVOKED_SESSIONS_TABLE).upsert({ nonce, expires_at: new Date(expiresAt).toISOString() });
    if (error) {
      if (isMissingTableError(error)) log.warn('admin_revocation.migration_pending', error);
      else log.error('admin_revocation.write', error);
      return;
    }
    await db.from(REVOKED_SESSIONS_TABLE).delete().lt('expires_at', new Date().toISOString());
  } catch (error) {
    log.error('admin_revocation.write', error instanceof Error ? error.message : error);
  }
}

/**
 * 폐기된 세션이면 true. 테이블이 없으면(마이그레이션 전) false. 그 밖의 오류는
 * true — 폐기 여부를 확인할 수 없는 세션은 받아들이지 않는다.
 */
export async function isRevoked(db: RevocationDb, nonce: string): Promise<boolean> {
  try {
    const { data, error } = await db.from(REVOKED_SESSIONS_TABLE).select('nonce').eq('nonce', nonce).maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return false;
      log.error('admin_revocation.read', error);
      return true;
    }
    return data != null;
  } catch (error) {
    log.error('admin_revocation.read', error instanceof Error ? error.message : error);
    return true;
  }
}
