import { NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { isOwnCloudinaryUrl } from '@/lib/cloudinary-upload';
import { isMissingColumnError, isUniqueViolation, withColumnFallback } from '@/lib/db-compat';
import { Id, ProductCreate, ProductUpdate } from '@/lib/admin/schemas';
import { revalidateShop } from '@/lib/admin/revalidate';
import { writeWithFallback, type BlockedBy } from '@/lib/admin/product-columns';
import {
  adminCloudinary,
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
  PRODUCT_ADDONS_MIGRATION,
  PRODUCT_SLUG_MIGRATION,
  productStatus,
  SHOP_READY_MIGRATION,
  syncedColumns,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from '@/lib/product';

// next/image remotePatterns 밖 주소는 렌더 중 죽는다 — 이 계정 Cloudinary 업로드와 Unsplash만.
function isAllowedProductImage(url: string, cloudName: string): boolean {
  if (isOwnCloudinaryUrl(url, cloudName)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

function checkImages(urls: Array<string | undefined>): Response | null {
  const given = urls.filter((url): url is string => url !== undefined);
  if (given.length === 0) return null;
  const cloudinary = adminCloudinary('admin_products');
  if (!cloudinary.ok) return cloudinary.response;
  const { cloudName } = cloudinary.value;
  if (!given.every(url => isAllowedProductImage(url, cloudName))) {
    return jsonError('상품 이미지는 이 사이트의 Cloudinary 업로드 주소여야 합니다.', 400);
  }
  return null;
}

function migrationBlockedResponse(blocked: BlockedBy): Response {
  const file =
    blocked === 'slug' ? PRODUCT_SLUG_MIGRATION : blocked === 'addons' ? PRODUCT_ADDONS_MIGRATION : SHOP_READY_MIGRATION;
  return jsonError(migrationNotice(file), 409, { migration: true });
}

// products의 유니크 제약은 slug 하나뿐이다.
const SLUG_TAKEN = '이 주소는 다른 상품이 이미 쓰고 있습니다. 다른 주소를 적어 주세요.';

// "판매 중인데 가격 없음"은 여기서 막는다 — 공개 화면은 조용히 숨기기 때문이다.
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

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_products');
  if (!db.ok) return db.response;

  // 상품이 0개일 수 있어 새 컬럼 유무는 마이그레이션 파일마다 한 컬럼씩 찔러 본다.
  const [list, probe, addonsProbe, slugProbe] = await Promise.all([
    withColumnFallback(
      'admin_products.list',
      () => db.value.from('products').select('*').order('sort_order').order('id'),
      () => db.value.from('products').select('*').order('id'),
    ),
    db.value.from('products').select('status').limit(1),
    db.value.from('products').select('addons').limit(1),
    db.value.from('products').select('slug').limit(1),
  ]);
  if (list.error) return dbErrorResponse('admin_products_fetch', list.error);
  if (probe.error && !isMissingColumnError(probe.error)) log.warn('admin_products_probe', probe.error);
  if (addonsProbe.error && !isMissingColumnError(addonsProbe.error)) log.warn('admin_products_addons_probe', addonsProbe.error);
  if (slugProbe.error && !isMissingColumnError(slugProbe.error)) log.warn('admin_products_slug_probe', slugProbe.error);

  return NextResponse.json({
    products: list.data ?? [],
    migrationPending: list.migrationPending,
    shopMigrationPending: Boolean(probe.error && isMissingColumnError(probe.error)),
    addonsMigrationPending: Boolean(addonsProbe.error && isMissingColumnError(addonsProbe.error)),
    slugMigrationPending: Boolean(slugProbe.error && isMissingColumnError(slugProbe.error)),
  });
}

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, ProductCreate);
  if (!body.ok) return body.response;
  const input = body.value;
  const badImage = checkImages([input.image_url, ...(input.images ?? []).map(image => image.url)]);
  if (badImage) return badImage;

  // 새 상품은 초안이 기본이다 — 가격 확인 전 0원 상품이 샵에 걸리지 않게.
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
    // 비어 있으면 키째 뺀다 — 그 마이그레이션 전에도 첫 시도에 들어가게.
    ...(input.addons?.length ? { addons: input.addons } : {}),
    ...(input.related_ids?.length ? { related_ids: input.related_ids } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    ...(sort_order === undefined ? {} : { sort_order }),
  };

  const insert = (values: Record<string, unknown>) => db.value.from('products').insert(values).select('*').single();

  // 컬럼 없음 오류면 한 겹씩 벗겨 다시 넣는다(추가 상품 → shop_ready → sort_order).
  const attempt = await writeWithFallback(row, insert);
  if (attempt.blocked) return migrationBlockedResponse(attempt.blocked);
  let { result } = attempt;
  const { migrationPending } = attempt;
  if (result.error && sort_order !== undefined && isMissingColumnError(result.error)) {
    const { sort_order: _dropped, ...oldest } = attempt.written;
    void _dropped;
    result = await insert(oldest);
  }
  if (isUniqueViolation(result.error)) return jsonError(SLUG_TAKEN, 409);
  if (result.error || !result.data) return dbErrorResponse('admin_products_insert', result.error, SHOP_READY_MIGRATION);

  log.info('admin_products_created', { id: result.data.id });
  revalidateShop();
  return NextResponse.json({ ok: true, product: result.data, migrationPending });
}

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

  // 상태·가격·옵션은 서로를 검증하므로 지금 행과 합친 모양으로 판단한다.
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

  const { result, migrationPending, blocked } = await writeWithFallback(row, update);
  if (blocked) return migrationBlockedResponse(blocked);
  if (isUniqueViolation(result.error)) return jsonError(SLUG_TAKEN, 409);
  if (result.error) return dbErrorResponse('admin_products_update', result.error, SHOP_READY_MIGRATION);
  if (!result.data) return jsonError('상품을 찾을 수 없습니다.', 404);

  revalidateShop();
  return NextResponse.json({ ok: true, product: result.data, migrationPending });
}

// 상품 행만 지운다. Cloudinary 이미지는 설정 탭의 "쓰이지 않는 원본"에서 정리한다.
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
