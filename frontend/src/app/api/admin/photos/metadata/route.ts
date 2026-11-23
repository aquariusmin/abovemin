import { NextResponse } from 'next/server';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { log } from '@/lib/logger';
import { fillPhotoMetadata, metadataProgress } from '@/lib/admin/metadata-fill';
import { MetadataRecheck, firstIssue } from '@/lib/admin/schemas';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminCloudinary,
  adminDb,
  guardMutation,
  guardRead,
  jsonError,
  migrationNotice,
} from '@/lib/admin/route-helpers';

// 요청당 20장 — 한 번에 다 돌리면 Vercel 함수 시간 상한에 걸린다.

// Admin API가 느린 날을 위한 여유. 배치는 DEADLINE_MS에서 새 요청을 멈춘다.
export const maxDuration = 60;

const DEADLINE_MS = 25_000;

function migrationResponse(): NextResponse {
  return jsonError(migrationNotice(ARCHIVE_EXTRAS_MIGRATION), 409, { migration: true });
}

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_photo_metadata');
  if (!db.ok) return db.response;

  const progress = await metadataProgress(db.value);
  if (!progress.ok) {
    if (progress.migration) return NextResponse.json({ total: 0, remaining: 0, migrationPending: true });
    log.error('admin_photo_metadata_progress', progress.error);
    return jsonError('DB error', 500);
  }
  return NextResponse.json({ total: progress.total, remaining: progress.remaining, migrationPending: false });
}

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;

  const raw = await request.text().catch(() => '');
  let recheckIds: number[] | undefined;
  if (raw.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return jsonError('요청 본문이 올바르지 않습니다.', 400);
    }
    const parsed = MetadataRecheck.safeParse(json);
    if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);
    recheckIds = parsed.data.ids;
  }

  const db = adminDb('admin_photo_metadata');
  if (!db.ok) return db.response;

  const cloudinary = adminCloudinary('admin_photo_metadata');
  if (!cloudinary.ok) return cloudinary.response;

  const outcome = await fillPhotoMetadata(db.value, cloudinary.value, {
    deadline: Date.now() + DEADLINE_MS,
    ...(recheckIds ? { ids: recheckIds, limit: recheckIds.length, recheck: true } : {}),
  });
  if (!outcome.ok) {
    if (outcome.migration) return migrationResponse();
    log.error('admin_photo_metadata_fill', outcome.error);
    return jsonError('DB error', 500);
  }

  const progress = await metadataProgress(db.value);
  if (!progress.ok) {
    if (progress.migration) return migrationResponse();
    log.error('admin_photo_metadata_progress', progress.error);
    return jsonError('DB error', 500);
  }

  if (outcome.result.processed > 0 || outcome.result.placesAdded.length > 0) revalidateArchive();

  return NextResponse.json({
    ...outcome.result,
    total: progress.total,
    remaining: progress.remaining,
  });
}
