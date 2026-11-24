// 클라이언트 번들에도 들어가므로 zod를 쓰지 않는다(저장 시 검증은 `lib/admin/schemas.ts`).
export const PRODUCT_STATUSES = ['draft', 'available', 'sold_out'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: '초안',
  available: '판매 중',
  sold_out: '품절',
};

export const SOLD_OUT_LABEL = '품절';

export const SHOP_READY_MIGRATION = 'supabase/migrations/20260917020000_shop_ready.sql';

function isStatus(value: unknown): value is ProductStatus {
  return typeof value === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(value);
}

export const IMAGE_LABELS = ['앞면', '뒷면', '디테일', '사용 예', '기타'] as const;
export const MAX_IMAGE_LABEL = 40;
export const MAX_IMAGES = 12;

export interface ProductImage {
  url: string;
  label: string | null;
}

// 비어 있으면 `image_url` 한 장으로 채운다(마이그레이션 전의 행).
export function parseImages(raw: unknown, fallbackUrl?: string | null): ProductImage[] {
  const images: ProductImage[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { url, label } = entry as { url?: unknown; label?: unknown };
      if (typeof url !== 'string' || url.trim() === '') continue;
      const text = typeof label === 'string' ? label.trim().slice(0, MAX_IMAGE_LABEL) : '';
      images.push({ url: url.trim(), label: text || null });
    }
  }
  if (images.length === 0 && fallbackUrl) images.push({ url: fallbackUrl, label: null });
  return images;
}

// 장바구니 키·주문 기록에 들어가는 불변 슬러그. `:`가 들어갈 수 없어 키가 모호해지지 않는다.
export const OPTION_ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const MAX_OPTION_LABEL = 40;
export const MAX_OPTIONS = 20;

export interface ProductOption {
  id: string;
  label: string;
  price: number;
  in_stock: boolean;
}

export function parseOptions(raw: unknown): ProductOption[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const options: ProductOption[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, label, price, in_stock } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !OPTION_ID_RE.test(id) || seen.has(id)) continue;
    if (typeof label !== 'string' || label.trim() === '') continue;
    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) continue;
    seen.add(id);
    options.push({ id, label: label.trim(), price, in_stock: in_stock === true });
  }
  return options;
}

// 0원 옵션은 "가격 미정"이지 무료가 아니다.
export function isOptionAvailable(option: ProductOption): boolean {
  return option.in_stock && option.price > 0;
}

// 표시·정렬용. 주문 금액에는 쓰지 않는다 — 주문은 언제나 고른 옵션의 가격이다.
export function optionsMinPrice(options: readonly ProductOption[]): number {
  const priced = options.map(option => option.price).filter(price => price > 0);
  return priced.length ? Math.min(...priced) : 0;
}

export const PRODUCT_ADDONS_MIGRATION = 'supabase/migrations/20261014010000_product_addons.sql';

// 모양·id 형식이 옵션과 같아 옵션 파서를 그대로 쓴다. 혼자서는 주문할 수 없다(`lib/order-items.ts`).
export type ProductAddon = ProductOption;
export const MAX_ADDONS = 10;
export const MAX_ADDON_LABEL = MAX_OPTION_LABEL;
export const ADDON_LABEL = '추가';

export function parseAddons(raw: unknown): ProductAddon[] {
  return parseOptions(raw).slice(0, MAX_ADDONS);
}

export const isAddonAvailable: (addon: ProductAddon) => boolean = isOptionAvailable;

export const MAX_RELATED = 6;

export function parseRelatedIds(raw: unknown, selfId?: number): number[] {
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry <= 0) continue;
    if (entry === selfId || ids.includes(entry)) continue;
    ids.push(entry);
    if (ids.length === MAX_RELATED) break;
  }
  return ids;
}

// 초안은 한 번 더 거른다 — 공개 목록이 이미 뺐어도 이 함수만 보고 안전해야 한다.
export function relatedProducts<P extends ProductStateInput & { id: number }>(
  ids: readonly number[],
  catalog: readonly P[],
  selfId?: number,
): P[] {
  const byId = new Map(catalog.map(product => [product.id, product]));
  const related: P[] = [];
  for (const id of parseRelatedIds([...ids], selfId)) {
    const product = byId.get(id);
    if (product && isListed(product)) related.push(product);
  }
  return related;
}

export interface ProductStateInput {
  price: number;
  in_stock: boolean;
  /** 20260917020000_shop_ready 이후 컬럼. 없으면 옛 규칙으로 계산한다. */
  status?: string | null;
  options?: unknown;
}

// `status` 컬럼이 없으면 마이그레이션 backfill과 같은 규칙으로 계산한다.
export function productStatus(product: ProductStateInput): ProductStatus {
  if (isStatus(product.status)) return product.status;
  return product.in_stock && product.price > 0 ? 'available' : 'draft';
}

// 판매 중이어도 옵션이 전부 품절이면 품절, 가격이 하나도 없으면 초안으로 본다.
export function publicState(product: ProductStateInput): ProductStatus {
  const status = productStatus(product);
  if (status !== 'available') return status;
  const options = parseOptions(product.options);
  if (options.length === 0) return product.price > 0 ? 'available' : 'draft';
  if (options.some(isOptionAvailable)) return 'available';
  return options.some(option => option.price > 0) ? 'sold_out' : 'draft';
}

export function isListed(product: ProductStateInput): boolean {
  return publicState(product) !== 'draft';
}

export function isAvailable(product: ProductStateInput): boolean {
  return publicState(product) === 'available';
}

export function priceRange(product: { price: number; options?: unknown }): { min: number; max: number } {
  const options = parseOptions(product.options);
  if (options.length === 0) return { min: product.price, max: product.price };
  const available = options.filter(isOptionAvailable);
  const pool = (available.length ? available : options).map(option => option.price).filter(price => price > 0);
  if (pool.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...pool), max: Math.max(...pool) };
}

// 서버(`api/admin/products`)와 편집기가 같은 함수를 부른다.
export function availabilityProblem(input: {
  status: ProductStatus;
  price: number;
  options: readonly ProductOption[];
}): string | null {
  if (input.status !== 'available') return null;
  if (input.options.length === 0) {
    return input.price > 0 ? null : '판매 중으로 두려면 가격이 0원보다 커야 합니다.';
  }
  return input.options.some(isOptionAvailable)
    ? null
    : '판매 중으로 두려면 재고가 있고 가격이 0원보다 큰 옵션이 하나는 있어야 합니다.';
}

// 서버가 맞추는 호환 컬럼: 옛 코드·장바구니·메일이 `price`·`image_url`·`in_stock`만 읽는다.
export function syncedColumns(input: {
  status: ProductStatus;
  price: number;
  options: readonly ProductOption[];
  images: readonly ProductImage[];
  image_url: string;
}): { price: number; image_url: string; in_stock: boolean } {
  return {
    price: input.options.length ? optionsMinPrice(input.options) : input.price,
    image_url: input.images[0]?.url ?? input.image_url,
    in_stock: input.status === 'available',
  };
}

// ── 상세 주소(slug) ───────────────────────────────────────────────────────────
export const PRODUCT_SLUG_MIGRATION = 'supabase/migrations/20261124000000_product_slug.sql';
export const MAX_SLUG = 60;

/** 마이그레이션의 `products_slug_format`과 같다. 글자가 하나는 있어야 한다 — 숫자만이면 id와 헷갈린다. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG && SLUG_RE.test(value) && /[a-z]/.test(value);
}

export function parseSlug(raw: unknown): string | null {
  return typeof raw === 'string' && isValidSlug(raw) ? raw : null;
}

/** 상세 주소. slug가 없으면(정하지 않았거나 마이그레이션 전) 숫자 id. */
export function productPath(product: { id: number; slug?: string | null }): string {
  return `/shop/${product.slug ?? product.id}`;
}

/** `/shop/<param>`의 param: 숫자면 id, 아니면 slug. 어느 쪽도 아니면 null(404). */
export function parseProductParam(param: string): { id: number } | { slug: string } | null {
  if (/^\d+$/.test(param)) {
    const id = Number(param);
    return Number.isSafeInteger(id) && id > 0 ? { id } : null;
  }
  return isValidSlug(param) ? { slug: param } : null;
}
