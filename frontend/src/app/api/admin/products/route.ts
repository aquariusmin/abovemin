import { NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { getCloudinaryConfig, isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import { isMissingColumnError, withColumnFallback } from '@/lib/db-compat';
import { Id, ProductCreate, ProductUpdate } from '@/lib/admin/schemas';
import { revalidateShop } from '@/lib/admin/revalidate';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

/**
 * 샵 상품 관리. 모든 변경 뒤에 `/`, `/shop`, `/shop/[id]`를 다시 굽는다.
 *
 * 주문(`orders.items`)은 주문 시점의 이름·가격을 복사해 두므로, 상품을 고치거나
 * 지워도 이미 들어온 주문은 바뀌지 않는다. 장바구니에 지운 상품이 남은 손님은
 * 주문 API가 "더 이상 판매하지 않는 상품"으로 막는다.
 */

/**
 * 상품 이미지로 저장할 수 있는 주소. 샵은 `next/image`로 렌더하므로
 * `next.config.ts`의 `remotePatterns`를 벗어나면 페이지가 렌더 도중 죽는다.
 * Cloudinary는 **이 계정**의 업로드 URL만(fetch 프록시 형태 차단), 그 밖에는
 * 기존 자리표시자가 쓰는 Unsplash만 허용한다.
 */
function isAllowedProductImage(url: string, cloudName: string): boolean {
  if (isOwnCloudinaryUrl(url, cloudName)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

function checkImage(url: string | undefined): Response | null {
  if (url === undefined) return null;
  let cloudName: string;
  try {
    cloudName = getCloudinaryConfig().cloudName;
  } catch (error) {
    log.error('admin_products_cloudinary', error);
    return jsonError('Cloudinary is not configured', 503);
  }
  if (!isAllowedProductImage(url, cloudName)) {
    return jsonError('상품 이미지는 이 사이트의 Cloudinary 업로드 주소여야 합니다.', 400);
  }
  return null;
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  const { data, error, migrationPending } = await withColumnFallback(
    'admin_products.list',
    () => db.value.from('products').select('*').order('sort_order').order('id'),
    () => db.value.from('products').select('*').order('id'),
  );
  if (error) return dbErrorResponse('admin_products_fetch', error);
  return NextResponse.json({ products: data ?? [], migrationPending });
}

// ── 만들기 ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, ProductCreate);
  if (!body.ok) return body.response;
  const badImage = checkImage(body.value.image_url);
  if (badImage) return badImage;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  const { sort_order, ...rest } = body.value;
  const row = {
    category: '',
    description: '',
    tag: null,
    // 새 상품은 기본으로 판매 중이 아니다. 가격을 확인하기 전에 0원 상품이
    // 장바구니에 담기는 일을 막는다 — 켜는 것은 관리자가 한다.
    in_stock: false,
    ...rest,
  };

  // `sort_order`는 새 컬럼이다. 마이그레이션 전이면 빼고 한 번 더 넣는다 —
  // 순서 하나 때문에 상품 등록 자체가 막히면 안 된다.
  let result = await db.value
    .from('products')
    .insert(sort_order === undefined ? row : { ...row, sort_order })
    .select('*')
    .single();
  let migrationPending = false;
  if (result.error && sort_order !== undefined && isMissingColumnError(result.error)) {
    migrationPending = true;
    result = await db.value.from('products').insert(row).select('*').single();
  }
  if (result.error) return dbErrorResponse('admin_products_insert', result.error);

  log.info('admin_products_created', { id: result.data.id });
  revalidateShop();
  return NextResponse.json({ ok: true, product: result.data, migrationPending });
}

// ── 고치기 ────────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, ProductUpdate);
  if (!body.ok) return body.response;
  const badImage = checkImage(body.value.image_url);
  if (badImage) return badImage;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  const { id, ...updates } = body.value;
  const { data, error } = await db.value
    .from('products')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return dbErrorResponse('admin_products_update', error);
  if (!data) return jsonError('상품을 찾을 수 없습니다.', 404);

  revalidateShop();
  return NextResponse.json({ ok: true, product: data });
}

// ── 지우기 ────────────────────────────────────────────────────────────────────

/**
 * 상품 행만 지운다. Cloudinary의 이미지는 남는다 — 설정 탭의 "쓰이지 않는 원본"
 * 정리가 `phorage/shop/`까지 훑으므로 거기서 지운다.
 */
export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, z.strictObject({ id: Id }));
  if (!body.ok) return body.response;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  const { data, error } = await db.value
    .from('products')
    .delete()
    .eq('id', body.value.id)
    .select('id')
    .maybeSingle();
  if (error) return dbErrorResponse('admin_products_delete', error);
  if (!data) return jsonError('상품을 찾을 수 없습니다.', 404);

  log.info('admin_products_deleted', { id: data.id });
  revalidateShop();
  return NextResponse.json({ ok: true, id: data.id });
}
