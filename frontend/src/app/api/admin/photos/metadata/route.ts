import { NextResponse } from 'next/server';
import { getCloudinaryConfig } from '@/lib/cloudinary-upload';
import { revalidateArchive } from '@/lib/cache-tags';
import { log } from '@/lib/logger';
import { fillPhotoMetadata, metadataProgress } from '@/lib/admin/metadata-fill';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminDb,
  guardMutation,
  guardRead,
  jsonError,
  migrationNotice,
} from '@/lib/admin/route-helpers';

/**
 * 촬영 정보 채우기. 관리 화면이 POST를 되풀이해 부르며 진행률을 그린다.
 *
 * 요청 하나가 하는 일은 20장이다. 한 번에 293장을 돌리면 Vercel 함수 시간
 * 상한에 걸리고, 중간에 끊기면 어디까지 했는지를 화면이 알 수 없다. 20장이면
 * 동시 4개 × 약 0.3초로 몇 초 안에 끝나고, 멈춤 버튼도 배치 사이에서 듣는다.
 */

// Admin API 응답이 느린 날을 위한 여유. 배치 자체는 아래 `DEADLINE_MS`에서 새
// 요청을 멈추므로 보통은 이 근처에도 가지 않는다.
export const maxDuration = 60;

const DEADLINE_MS = 25_000;

function migrationResponse(): NextResponse {
  return jsonError(migrationNotice(ARCHIVE_EXTRAS_MIGRATION), 409, { migration: true });
}

/** 전체 장수와 아직 시도하지 않은 장수. 마이그레이션 전이면 `migrationPending`. */
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

/** 한 배치를 처리하고 남은 장수를 돌려준다. 본문은 받지 않는다. */
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const db = adminDb('admin_photo_metadata');
  if (!db.ok) return db.response;

  let config: ReturnType<typeof getCloudinaryConfig>;
  try {
    config = getCloudinaryConfig();
  } catch (error) {
    log.error('admin_photo_metadata_cloudinary', error);
    return jsonError('Cloudinary is not configured', 503);
  }

  const outcome = await fillPhotoMetadata(db.value, config, { deadline: Date.now() + DEADLINE_MS });
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

  // 크기와 촬영 정보는 공개 화면(그리드 비율, 라이트박스)에 나가고, 새 장소
  // 좌표는 /archive 지도에 나간다.
  if (outcome.result.processed > 0 || outcome.result.placesAdded.length > 0) revalidateArchive();

  return NextResponse.json({
    ...outcome.result,
    total: progress.total,
    remaining: progress.remaining,
  });
}
