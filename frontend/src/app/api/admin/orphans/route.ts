import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { OrphanDelete } from '@/lib/admin/schemas';
import { partitionDeletable } from '@/lib/admin/orphans';
import {
  deleteResources,
  listManagedResources,
  loadReferencedPublicIds,
  MAX_ASSETS_PER_PREFIX,
  type CloudinaryResource,
} from '@/lib/admin/cloudinary-admin';
import {
  adminCloudinary,
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

// 원본 파기는 이 화면에서만 명시적으로 한다. 범위는 관리 화면이 올리는 폴더뿐이다.

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const config = adminCloudinary('admin_orphans');
  if (!config.ok) return config.response;
  const db = adminDb('admin_orphans');
  if (!db.ok) return db.response;

  const referenced = await loadReferencedPublicIds(db.value);
  if (!referenced.ok) return dbErrorResponse('admin_orphans_db_read', referenced.error);

  let listing: { resources: CloudinaryResource[]; truncated: boolean };
  try {
    listing = await listManagedResources(config.value);
  } catch (error) {
    log.error('admin_orphans_fetch', error);
    return jsonError('Cloudinary 조회에 실패했습니다.', 502);
  }

  const orphans = listing.resources
    .filter(r => !referenced.ids.has(r.public_id))
    .map(r => ({
      publicId: r.public_id,
      url: r.secure_url,
      bytes: r.bytes,
      createdAt: r.created_at,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return NextResponse.json({
    scanned: listing.resources.length,
    truncated: listing.truncated,
    limitPerFolder: MAX_ASSETS_PER_PREFIX,
    matched: listing.resources.length - orphans.length,
    referenced: referenced.ids.size,
    orphans,
    totalBytes: orphans.reduce((sum, o) => sum + o.bytes, 0),
  });
}

// 화면이 보낸 목록을 믿지 않는다 — 지우기 직전 DB 참조를 다시 읽어 하나씩 재판정한다.
export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, OrphanDelete);
  if (!body.ok) return body.response;
  const config = adminCloudinary('admin_orphans_delete');
  if (!config.ok) return config.response;
  const db = adminDb('admin_orphans_delete');
  if (!db.ok) return db.response;

  const referenced = await loadReferencedPublicIds(db.value);
  // 참조를 읽지 못했으면 아무것도 지우지 않는다. "모르겠다"는 "안 쓰인다"가 아니다.
  if (!referenced.ok) return dbErrorResponse('admin_orphans_delete_db_read', referenced.error);

  const plan = partitionDeletable(body.value.public_ids, referenced.ids);
  if (plan.deletable.length === 0) {
    return NextResponse.json({ ok: true, deleted: [], notFound: [], refused: plan.refused });
  }

  let result: Record<string, string>;
  try {
    result = await deleteResources(config.value, plan.deletable);
  } catch (error) {
    log.error('admin_orphans_delete', error);
    return jsonError('Cloudinary에서 지우지 못했습니다.', 502);
  }

  const deleted = plan.deletable.filter(id => result[id] === 'deleted');
  const notFound = plan.deletable.filter(id => result[id] !== 'deleted');
  log.info('admin_orphans_deleted', { deleted: deleted.length, notFound: notFound.length, refused: plan.refused.length });

  return NextResponse.json({ ok: true, deleted, notFound, refused: plan.refused });
}
