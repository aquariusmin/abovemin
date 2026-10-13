import { publicIdFromUrl } from '@/lib/cloudinary';

/**
 * Cloudinary 미사용 자산 판정. 스캔(GET)과 삭제(DELETE)가 **같은 규칙**을 쓴다.
 *
 * 삭제는 되돌릴 수 없다. 그래서 서버는 화면이 보낸 목록을 믿지 않는다 — 스캔한
 * 뒤 누군가 그 파일을 커버로 걸었을 수도 있고, 요청 본문은 조작될 수 있다.
 * 지우기 직전에 DB를 다시 읽어 **바로 그 public_id들만** 다시 판정하고, 그중
 * 통과한 것만 지운다(`partitionDeletable`).
 */

/**
 * 관리 화면이 올리는 폴더. 스캔도 삭제도 이 안쪽만 본다.
 *
 * 밖에 있는 자산은 코드가 직접 가리킬 수 있다 — 예를 들어 홈 히어로의 기본
 * 이미지(`app/(site)/page.tsx`)는 루트에 있고 DB 어디에도 없다. DB만 보고 판정하면
 * 그런 파일이 "미사용"으로 잡힌다. 그래서 범위 자체를 좁힌다.
 */
export const MANAGED_PREFIXES = ['phorage/archive/', 'phorage/shop/'] as const;

export function isManagedPublicId(publicId: string): boolean {
  if (typeof publicId !== 'string' || publicId.length === 0 || publicId.length > 300) return false;
  // 경로 조작이나 제어 문자가 섞인 값은 애초에 Cloudinary가 만든 id가 아니다.
  if (publicId.includes('..') || /[\u0000-\u001f\u007f]/.test(publicId)) return false;
  return MANAGED_PREFIXES.some(prefix => publicId.startsWith(prefix) && publicId.length > prefix.length);
}

/**
 * DB에서 모은 값들 → 쓰이고 있는 public_id 집합.
 *
 * 어느 컬럼이 이미지인지 여기서 가정하지 않는다. 문자열이고 Cloudinary URL로
 * 파싱되면 쓰이는 것으로 친다 — `site_settings`처럼 key/value인 곳도 그렇게
 * 다룬다. 빠뜨리는 쪽이 위험하고, 더 넣는 쪽은 한 파일을 덜 지울 뿐이다.
 */
export function collectReferencedPublicIds(values: Iterable<unknown>): Set<string> {
  const used = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) continue;
    const id = publicIdFromUrl(value);
    if (id) used.add(id);
  }
  return used;
}

export type RefusalReason = 'referenced' | 'outside_prefix';

export interface DeletePlan {
  deletable: string[];
  refused: Array<{ publicId: string; reason: RefusalReason }>;
}

export function partitionDeletable(requested: string[], referenced: Set<string>): DeletePlan {
  const plan: DeletePlan = { deletable: [], refused: [] };
  for (const publicId of new Set(requested)) {
    if (!isManagedPublicId(publicId)) {
      plan.refused.push({ publicId, reason: 'outside_prefix' });
    } else if (referenced.has(publicId)) {
      plan.refused.push({ publicId, reason: 'referenced' });
    } else {
      plan.deletable.push(publicId);
    }
  }
  return plan;
}
