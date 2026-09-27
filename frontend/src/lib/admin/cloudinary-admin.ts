import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudinaryConfig } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { MANAGED_PREFIXES, collectReferencedPublicIds } from './orphans';

/**
 * Cloudinary Admin API 호출과 "무엇이 쓰이고 있나" 조회. **서버 전용.**
 *
 * 스캔(GET)과 삭제(DELETE)가 같은 두 함수를 쓴다. 삭제 쪽이 참조 목록을 따로
 * 만들면, 스캔에 새 테이블을 더했을 때 삭제만 그걸 모르는 상태가 생긴다 —
 * 그 차이는 곧 "쓰이는 파일을 지웠다"이다.
 */

/** 폴더 하나당 한 번에 훑을 자산 수. Admin API는 호출 수에 쿼터가 있다. */
export const MAX_ASSETS_PER_PREFIX = 500;

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  bytes: number;
  created_at: string;
}

function authHeader(config: CloudinaryConfig): string {
  // Admin API는 Basic 인증(api_key:api_secret)을 쓴다.
  return `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
}

/**
 * Cloudinary URL이 들어 있는 **모든** 곳을 모은다.
 *
 * 처음에는 `photos.src`만 봤는데, 그 목록으로는 앨범 커버가 고아로 잡혔다
 * (`phorage/archive/photo_17` — /archive/japan의 커버이자 OG 이미지). 이
 * 목록을 믿고 지웠으면 앨범 표지가 통째로 사라졌을 것이다.
 *
 * 숨긴 사진(`hidden`)도 참조로 친다 — 숨김은 되돌릴 수 있는 상태이고, 되돌렸을
 * 때 파일이 없으면 안 된다. 테이블이 늘어나면 여기도 늘어나야 한다.
 */
export async function loadReferencedPublicIds(
  db: SupabaseClient,
): Promise<{ ok: true; ids: Set<string> } | { ok: false; error: unknown }> {
  const [photos, albums, products, settings] = await Promise.all([
    db.from('photos').select('src'),
    db.from('albums').select('cover'),
    // `*`: `images`(20260917020000_shop_ready)는 마이그레이션 전 DB에 없다. 이름으로
    // 고르면 스캔 자체가 실패한다.
    db.from('products').select('*'),
    db.from('site_settings').select('value'),
  ]);
  const failed = [photos, albums, products, settings].find(result => result.error);
  if (failed?.error) return { ok: false, error: failed.error };

  const values: unknown[] = [
    ...(photos.data ?? []).map(row => row.src),
    ...(albums.data ?? []).map(row => row.cover),
    ...(products.data ?? []).map(row => row.image_url),
    // 상품 갤러리의 나머지 장. 커버(`image_url`)만 보면 두 번째 장부터가 전부
    // "쓰이지 않는 원본"으로 잡혀 지워진다.
    ...(products.data ?? []).flatMap(row =>
      Array.isArray(row.images) ? row.images.map((image: { url?: unknown }) => image?.url) : [],
    ),
    // key/value라 어느 키가 이미지인지 가정하지 않는다.
    ...(settings.data ?? []).map(row => row.value),
  ];
  return { ok: true, ids: collectReferencedPublicIds(values) };
}

export async function listManagedResources(
  config: CloudinaryConfig,
): Promise<{ resources: CloudinaryResource[]; truncated: boolean }> {
  const pages = await Promise.all(
    MANAGED_PREFIXES.map(async prefix => {
      const endpoint =
        `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload` +
        `?prefix=${encodeURIComponent(prefix)}&type=upload&max_results=${MAX_ASSETS_PER_PREFIX}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: authHeader(config) },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`cloudinary_list_${res.status}`);
      return (await res.json()) as { resources?: CloudinaryResource[]; next_cursor?: string };
    }),
  );
  return {
    resources: pages.flatMap(page => page.resources ?? []),
    // 다음 페이지가 있다면 이 목록은 완전하지 않다.
    truncated: pages.some(page => Boolean(page.next_cursor)),
  };
}

/**
 * 지정한 public_id만 지운다. 호출 전에 반드시 `partitionDeletable`을 거친다.
 *
 * `invalidate=true`: CDN 캐시도 비운다. 그러지 않으면 지운 파일이 캐시가 끝날
 * 때까지 URL로 계속 열리고, "지웠는데 아직 보인다"가 된다.
 */
export async function deleteResources(
  config: CloudinaryConfig,
  publicIds: string[],
): Promise<Record<string, string>> {
  const query = [
    ...publicIds.map(id => `public_ids[]=${encodeURIComponent(id)}`),
    'invalidate=true',
  ].join('&');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload?${query}`,
    { method: 'DELETE', headers: { Authorization: authHeader(config) }, cache: 'no-store' },
  );
  if (!res.ok) {
    log.error('cloudinary_delete_http', { status: res.status });
    throw new Error(`cloudinary_delete_${res.status}`);
  }
  const body = (await res.json()) as { deleted?: Record<string, string> };
  return body.deleted ?? {};
}
