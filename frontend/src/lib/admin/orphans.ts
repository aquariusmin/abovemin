import { publicIdFromUrl } from '@/lib/cloudinary';

// 삭제는 되돌릴 수 없다: 지우기 직전 DB를 다시 읽어 그 public_id만 재판정한다(partitionDeletable).

// 이 폴더 안쪽만 본다. 밖의 자산(홈 히어로 기본 이미지 등)은 코드가 직접 가리킨다.
export const MANAGED_PREFIXES = ['phorage/archive/', 'phorage/shop/'] as const;

export function isManagedPublicId(publicId: string): boolean {
  if (typeof publicId !== 'string' || publicId.length === 0 || publicId.length > 300) return false;
  // 경로 조작이나 제어 문자가 섞인 값은 애초에 Cloudinary가 만든 id가 아니다.
  if (publicId.includes('..') || /[\u0000-\u001f\u007f]/.test(publicId)) return false;
  return MANAGED_PREFIXES.some(prefix => publicId.startsWith(prefix) && publicId.length > prefix.length);
}

// 컬럼을 가정하지 않는다. Cloudinary URL로 파싱되는 문자열은 모두 쓰이는 것으로 친다.
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
