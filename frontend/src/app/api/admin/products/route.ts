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
  migrationNotice,
  parseBody,
} from '@/lib/admin/route-helpers';
import {
  availabilityProblem,
  parseImages,
  parseOptions,
  productStatus,
  SHOP_READY_MIGRATION,
  syncedColumns,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from '@/lib/product';

/**
 * 샵 상품 관리. 모든 변경 뒤에 `/`, `/shop`, `/shop/[id]`, sitemap을 다시 굽는다.
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

/** 들어온 이미지 주소 전부(`image_url` + 갤러리)를 같은 규칙으로 본다. */
function checkImages(urls: Array<string | undefined>): Response | null {
  const given = urls.filter((url): url is string => url !== undefined);
  if (given.length === 0) return null;
  let cloudName: string;
  try {
    cloudName = getCloudinaryConfig().cloudName;
  } catch (error) {
    log.error('admin_products_cloudinary', error);
    return jsonError('Cloudinary is not configured', 503);
  }
  if (!given.every(url => isAllowedProductImage(url, cloudName))) {
    return jsonError('상품 이미지는 이 사이트의 Cloudinary 업로드 주소여야 합니다.', 400);
  }
  return null;
}

/**
 * `status`·`images`·`options`·`edition`은 20260917020000_shop_ready 이후 컬럼이다.
 * 적용 전이면 이 키들을 빼고 한 번 더 저장한다 — 상태는 `in_stock`에, 커버는
 * `image_url`에 이미 담겨 있으므로 이름·가격·판매 여부 수정은 계속 된다.
 *
 * 단, 빼면 **내용이 사라지는** 저장(옵션, 두 장 이상의 이미지, 에디션)은
 * 조용히 반쯤 저장하지 않고 409로 알린다. 관리자는 "저장했습니다"를 보고
 * 옵션이 들어갔다고 믿는다.
 */
const SHOP_READY_COLUMNS = ['status', 'images', 'options', 'edition'] as const;

function withoutShopReadyColumns(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !(SHOP_READY_COLUMNS as readonly string[]).includes(key)));
}

function losesDataWithoutMigration(row: Record<string, unknown>): boolean {
  const images = Array.isArray(row.images) ? row.images.length : 0;
  const options = Array.isArray(row.options) ? row.options.length : 0;
  return images > 1 || options > 0 || Boolean(row.edition);
}

function shopMigrationResponse(): Response {
  return jsonError(migrationNotice(SHOP_READY_MIGRATION), 409, { migration: true });
}

/**
 * 합쳐진 상품(기존 행 + 이번 변경)을 검증하고, 서버가 맞추는 호환 컬럼을 계산한다.
 * "판매 중인데 팔 가격이 없음"은 여기서 막는다 — 공개 화면은 그런 상품을 초안처럼
 * 숨기지만, 관리자는 저장이 됐다고 믿고 있을 것이다.
 */
function finalize(merged: {
  status: ProductStatus;
  price: number;
  options: ProductOption[];
  images: ProductImage[];
  image_url: string;
}): { ok: true; columns: ReturnType<typeof syncedColumns> } | { ok: false; response: Response } {
  if (!merged.image_url && merged.images.length === 0) {
    return { ok: false, response: jsonError('상품 이미지를 한 장 이상 올려 주세요.', 400) };
  }
  const columns = syncedColumns(merged);
  const problem = availabilityProblem({ status: merged.status, price: columns.price, options: merged.options });
  if (problem) return { ok: false, response: jsonError(problem, 400) };
  return { ok: true, columns };
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  // 목록은 `*`라 적용 전후 모두 읽힌다. 새 컬럼이 있는지는 행을 보고 알 수
  // 없으므로(상품이 0개일 수도 있다) 한 컬럼만 따로 찔러 본다.
  const [list, probe] = await Promise.all([
    withColumnFallback(
      'admin_products.list',
      () => db.value.from('products').select('*').order('sort_order').order('id'),
      () => db.value.from('products').select('*').order('id'),
    ),
    db.value.from('products').select('status').limit(1),
  ]);
  if (list.error) return dbErrorResponse('admin_products_fetch', list.error);
  if (probe.error && !isMissingColumnError(probe.error)) log.warn('admin_products_probe', probe.error);

  return NextResponse.json({
    products: list.data ?? [],
    migrationPending: list.migrationPending,
    shopMigrationPending: Boolean(probe.error && isMissingColumnError(probe.error)),
  });
}

// ── 만들기 ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, ProductCreate);
  if (!body.ok) return body.response;
  const input = body.value;
  const badImage = checkImages([input.image_url, ...(input.images ?? []).map(image => image.url)]);
  if (badImage) return badImage;

  // 새 상품은 기본으로 초안이다. 가격을 확인하기 전에 0원 상품이 샵에 걸리거나
  // 장바구니에 담기는 일을 막는다 — 공개는 관리자가 한다.
  const status = input.status ?? 'draft';
  const images = input.images ?? [];
  const options = input.options ?? [];
  const finalized = finalize({ status, price: input.price ?? 0, options, images, image_url: input.image_url ?? '' });
  if (!finalized.ok) return finalized.response;

  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  const { sort_order } = input;
  const row: Record<string, unknown> = {
    name: input.name,
    category: input.category ?? '',
    description: input.description ?? '',
    tag: input.tag ?? null,
    ...finalized.columns,
    status,
    images,
    options,
    edition: input.edition ?? null,
    ...(sort_order === undefined ? {} : { sort_order }),
  };

  const insert = (values: Record<string, unknown>) => db.value.from('products').insert(values).select('*').single();

  // 컬럼이 없다는 오류면 한 겹씩 벗겨 다시 넣는다: 먼저 shop_ready 컬럼, 그래도
  // 없으면 `sort_order`(admin_studio). 순서 하나 때문에 등록 자체가 막히면 안 된다.
  let result = await insert(row);
  let migrationPending = false;
  if (result.error && isMissingColumnError(result.error)) {
    if (losesDataWithoutMigration(row)) return shopMigrationResponse();
    migrationPending = true;
    const legacy = withoutShopReadyColumns(row);
    result = await insert(legacy);
    if (result.error && sort_order !== undefined && isMissingColumnError(result.error)) {
      const { sort_order: _dropped, ...oldest } = legacy;
      void _dropped;
      result = await insert(oldest);
    }
  }
  if (result.error) return dbErrorResponse('admin_products_insert', result.error, SHOP_READY_MIGRATION);

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
  const { id, ...updates } = body.value;
  const badImage = checkImages([updates.image_url, ...(updates.images ?? []).map(image => image.url)]);
  if (badImage) return badImage;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  // 상태·가격·옵션은 서로를 검증한다("판매 중이면 팔 가격이 있어야"). 이번에
  // 한 필드만 왔어도 나머지는 지금 행에서 가져와 합친 모양으로 판단한다.
  const { data: current, error: lookupError } = await db.value.from('products').select('*').eq('id', id).maybeSingle();
  if (lookupError) return dbErrorResponse('admin_products_lookup', lookupError);
  if (!current) return jsonError('상품을 찾을 수 없습니다.', 404);

  const status = updates.status ?? productStatus(current);
  const images = updates.images ?? parseImages(current.images, updates.image_url ?? current.image_url);
  const options = updates.options ?? parseOptions(current.options);
  const finalized = finalize({
    status,
    price: updates.price ?? current.price,
    options,
    images,
    image_url: updates.image_url ?? current.image_url,
  });
  if (!finalized.ok) return finalized.response;

  const row: Record<string, unknown> = { ...updates, ...finalized.columns };
  const update = (values: Record<string, unknown>) =>
    db.value.from('products').update(values).eq('id', id).select('*').maybeSingle();

  let result = await update(row);
  let migrationPending = false;
  if (result.error && isMissingColumnError(result.error)) {
    if (losesDataWithoutMigration(row)) return shopMigrationResponse();
    migrationPending = true;
    result = await update(withoutShopReadyColumns(row));
  }
  if (result.error) return dbErrorResponse('admin_products_update', result.error, SHOP_READY_MIGRATION);
  if (!result.data) return jsonError('상품을 찾을 수 없습니다.', 404);

  revalidateShop();
  return NextResponse.json({ ok: true, product: result.data, migrationPending });
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
