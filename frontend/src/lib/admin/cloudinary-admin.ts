import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudinaryConfig } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { selectAll } from '@/lib/select-all';
import { MANAGED_PREFIXES, collectReferencedPublicIds } from './orphans';

// 서버 전용. 스캔과 삭제가 같은 참조 조회를 써야 쓰이는 파일을 지우지 않는다.

// Admin API는 호출 수에 쿼터가 있다.
export const MAX_ASSETS_PER_PREFIX = 500;

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  bytes: number;
  created_at: string;
}

function authHeader(config: CloudinaryConfig): string {
  return `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
}

// URL이 있는 모든 곳(숨긴 사진 포함)을 selectAll로 끝까지 읽는다. 빠진 원본은 삭제 대상이 된다.
export async function loadReferencedPublicIds(
  db: SupabaseClient,
): Promise<{ ok: true; ids: Set<string> } | { ok: false; error: unknown }> {
  const [photos, albums, products, settings] = await Promise.all([
    selectAll<{ src: unknown }>((from, to) => db.from('photos').select('src').order('id').range(from, to)),
    selectAll<{ cover: unknown }>((from, to) => db.from('albums').select('cover').order('slug').range(from, to)),
    // `*`: `images` 컬럼은 마이그레이션 전 DB에 없어 이름으로 고르면 스캔이 실패한다.
    selectAll<{ image_url?: unknown; images?: unknown }>((from, to) =>
      db.from('products').select('*').order('id').range(from, to),
    ),
    selectAll<{ value: unknown }>((from, to) => db.from('site_settings').select('value').order('key').range(from, to)),
  ]);
  const failed = [photos, albums, products, settings].find(result => result.error);
  if (failed?.error) return { ok: false, error: failed.error };

  const values: unknown[] = [
    ...(photos.data ?? []).map(row => row.src),
    ...(albums.data ?? []).map(row => row.cover),
    ...(products.data ?? []).map(row => row.image_url),
    // 커버만 보면 갤러리 두 번째 장부터 고아로 잡혀 지워진다.
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

// 호출 전에 반드시 `partitionDeletable`을 거친다. invalidate=true로 CDN 캐시도 비운다.
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
