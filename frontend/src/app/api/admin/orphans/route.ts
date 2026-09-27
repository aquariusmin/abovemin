import { NextResponse } from 'next/server';
import { getCloudinaryConfig, type CloudinaryConfig } from '@/lib/cloudinary-upload';
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
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

/**
 * Cloudinary에는 남아 있지만 사이트 어디에서도 쓰이지 않는 파일.
 *
 * 사진을 내려도 원본을 바로 지우지 않는 것은 의도된 설계다 — 사이트에서 내리는
 * 것과 원본을 파기하는 것은 되돌릴 수 있는 정도가 다르다. 그래서 파기는 이
 * 화면에서 **따로, 명시적으로** 한다: 스캔(GET)으로 목록을 보고, 고른 것만
 * 지운다(DELETE).
 *
 * 범위는 관리 화면이 올리는 폴더(`phorage/archive/`, `phorage/shop/`)뿐이다.
 * 그 밖의 자산은 코드가 직접 가리킬 수 있어 DB만 보고 판정할 수 없다.
 */

function cloudinaryConfig(label: string): { ok: true; value: CloudinaryConfig } | { ok: false; response: NextResponse } {
  try {
    return { ok: true, value: getCloudinaryConfig() };
  } catch (error) {
    log.error(`${label}_config`, error);
    return { ok: false, response: jsonError('Cloudinary is not configured', 503) };
  }
}

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const config = cloudinaryConfig('admin_orphans');
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
    // 폴더당 조회 상한을 넘었는지. 넘었다면 이 목록은 완전하지 않다.
    truncated: listing.truncated,
    limitPerFolder: MAX_ASSETS_PER_PREFIX,
    // 훑은 자산 중 실제로 쓰이는 수. DB가 참조하는 총수(`referenced`)와는
    // 다르다 — 참조 중 일부는 이 폴더들 밖의 자산을 가리킨다.
    matched: listing.resources.length - orphans.length,
    referenced: referenced.ids.size,
    orphans,
    totalBytes: orphans.reduce((sum, o) => sum + o.bytes, 0),
  });
}

/**
 * 고른 미사용 파일을 Cloudinary에서 **영구히** 지운다.
 *
 * 화면이 보낸 목록을 믿지 않는다. 스캔한 뒤 그 파일이 커버로 걸렸을 수도 있고,
 * 본문은 조작될 수 있다. 지우기 직전에 DB의 참조를 **다시** 읽고, 요청한
 * public_id 하나하나를 다시 판정해 통과한 것만 지운다. 거절한 것은 이유와 함께
 * 돌려준다.
 */
export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, OrphanDelete);
  if (!body.ok) return body.response;
  const config = cloudinaryConfig('admin_orphans_delete');
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
