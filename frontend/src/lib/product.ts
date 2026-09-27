/**
 * 상품의 상태·이미지·옵션을 읽는 규칙. **공개 화면, 장바구니, 주문 API, 관리
 * API가 이 파일 하나를 같이 본다.**
 *
 * 예전에는 "살 수 있는가"가 `in_stock && price > 0` 한 줄이었고, 그 한 줄을
 * 화면마다 다르게 읽었다 — 홈은 `₩ 0`, 목록은 "가격 미정", 상세는 "Sold out".
 * 같은 사실을 네 가지로 말하면 방문자는 네 가지 다른 상태로 읽는다. 상태가
 * 셋(초안·판매 중·품절)으로, 가격이 옵션별로 늘어난 지금은 그 어긋남이 더
 * 쉽게 생기므로 판정을 한곳에 둔다.
 *
 * 클라이언트 번들에도 들어가므로 zod를 쓰지 않는다. 형태 검증(저장 시점)은
 * `lib/admin/schemas.ts`가, 읽을 때의 방어는 여기의 `parse*`가 맡는다.
 */

// ── 상태 ──────────────────────────────────────────────────────────────────────

export const PRODUCT_STATUSES = ['draft', 'available', 'sold_out'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** 관리 화면의 상태 이름. */
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: '초안',
  available: '판매 중',
  sold_out: '품절',
};

/**
 * 공개 화면의 "살 수 없음" 문구. 초안은 공개 화면에 나오지 않으므로(아예
 * 목록에서 빠진다) 방문자가 보는 "살 수 없음"은 이제 품절 하나뿐이다.
 *
 * 예전의 "준비 중"은 한 번도 판 적 없는 자리표시자를 품절이라 부르지 않으려던
 * 문구였다. 그 자리표시자들은 이제 초안이 되어 보이지 않는다.
 */
export const SOLD_OUT_LABEL = '품절';

/** 마이그레이션 파일 — 관리 화면이 "무엇을 적용하라"고 안내할 때 쓴다. */
export const SHOP_READY_MIGRATION = 'supabase/migrations/20260917020000_shop_ready.sql';

function isStatus(value: unknown): value is ProductStatus {
  return typeof value === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(value);
}

// ── 이미지 ────────────────────────────────────────────────────────────────────

/** 이미지 설명의 기본 선택지. 이 밖의 값도 40자까지 자유롭게 쓸 수 있다. */
export const IMAGE_LABELS = ['앞면', '뒷면', '디테일', '사용 예', '기타'] as const;
export const MAX_IMAGE_LABEL = 40;
export const MAX_IMAGES = 12;

export interface ProductImage {
  url: string;
  label: string | null;
}

/**
 * `products.images`(jsonb) → 이미지 목록. 모양이 틀린 항목은 버린다.
 *
 * 비어 있으면 `image_url` 한 장으로 채운다 — 마이그레이션 전의 행과, 적용 후
 * 아직 이미지 관리에서 손대지 않은 행이 그렇다. 그래서 갤러리는 "이미지가
 * 없음"을 따로 다루지 않아도 된다.
 */
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

// ── 옵션 ──────────────────────────────────────────────────────────────────────

/**
 * 옵션 id. 장바구니 줄의 키(`상품id:옵션id`)와 주문 기록에 들어가므로 짧고
 * 바뀌지 않는 슬러그다. 라벨("A3 · 매트지")을 고쳐도 id는 그대로여야 이미 담긴
 * 장바구니가 계속 맞는다. `:`가 들어갈 수 없어 키가 모호해지지 않는다.
 */
export const OPTION_ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const MAX_OPTION_LABEL = 40;
export const MAX_OPTIONS = 20;

export interface ProductOption {
  id: string;
  label: string;
  price: number;
  in_stock: boolean;
}

/** `products.options`(jsonb) → 옵션 목록. 모양이 틀린 항목과 중복 id는 버린다. */
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

/** 옵션 하나를 지금 살 수 있는가. 0원 옵션은 "가격 미정"이지 무료가 아니다. */
export function isOptionAvailable(option: ProductOption): boolean {
  return option.in_stock && option.price > 0;
}

/**
 * 옵션이 있는 상품의 `products.price`. 가장 싼 **가격이 정해진** 옵션의 값이다.
 * 목록 정렬·홈 소개·마이그레이션 전 코드가 이 값을 읽는다. 주문 금액에는 쓰지
 * 않는다 — 주문은 언제나 고른 옵션의 가격이다.
 */
export function optionsMinPrice(options: readonly ProductOption[]): number {
  const priced = options.map(option => option.price).filter(price => price > 0);
  return priced.length ? Math.min(...priced) : 0;
}

// ── 판정 ──────────────────────────────────────────────────────────────────────

export interface ProductStateInput {
  price: number;
  in_stock: boolean;
  /** 마이그레이션(20260917020000_shop_ready) 이후 컬럼. 없으면 옛 규칙으로 계산한다. */
  status?: string | null;
  options?: unknown;
}

/**
 * 저장된 상태. `status` 컬럼이 없으면(마이그레이션 전) 마이그레이션의 backfill과
 * **같은 규칙**으로 계산한다: 재고와 가격이 둘 다 있으면 판매 중, 아니면 초안.
 * 그래서 적용 전후로 공개 화면이 같아 보인다.
 */
export function productStatus(product: ProductStateInput): ProductStatus {
  if (isStatus(product.status)) return product.status;
  return product.in_stock && product.price > 0 ? 'available' : 'draft';
}

/**
 * 공개 화면이 보여 줄 상태. 저장된 상태에 "실제로 팔 수 있는가"를 겹친다.
 *
 *  - 판매 중인데 옵션이 전부 품절 → 품절로 보인다. 관리자가 옵션 재고만 끄고
 *    상품 상태를 깜빡해도 "담기"가 살아 있지 않게.
 *  - 판매 중인데 가격이 하나도 없음 → 초안으로 친다. 보여 줄 가격도 팔 방법도
 *    없는 카드는 목록에 걸 이유가 없다(관리 API가 애초에 저장을 막는다).
 */
export function publicState(product: ProductStateInput): ProductStatus {
  const status = productStatus(product);
  if (status !== 'available') return status;
  const options = parseOptions(product.options);
  if (options.length === 0) return product.price > 0 ? 'available' : 'draft';
  if (options.some(isOptionAvailable)) return 'available';
  return options.some(option => option.price > 0) ? 'sold_out' : 'draft';
}

/** 공개 화면(목록·상세·sitemap)에 나오는가. 초안은 어디에도 없다. */
export function isListed(product: ProductStateInput): boolean {
  return publicState(product) !== 'draft';
}

/** 지금 장바구니에 담을 수 있는가. */
export function isAvailable(product: ProductStateInput): boolean {
  return publicState(product) === 'available';
}

/**
 * 목록·상세의 가격 범위. 옵션이 있으면 **지금 살 수 있는** 옵션의 최저·최고,
 * 그런 옵션이 없으면(품절) 가격이 있는 옵션 전체의 범위다.
 */
export function priceRange(product: { price: number; options?: unknown }): { min: number; max: number } {
  const options = parseOptions(product.options);
  if (options.length === 0) return { min: product.price, max: product.price };
  const available = options.filter(isOptionAvailable);
  const pool = (available.length ? available : options).map(option => option.price).filter(price => price > 0);
  if (pool.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...pool), max: Math.max(...pool) };
}

/**
 * "판매 중"으로 저장해도 되는가. 문제가 있으면 관리 화면에 보일 문장, 없으면 null.
 * 서버(`api/admin/products`)와 편집기가 같은 함수를 부른다.
 */
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

/**
 * 저장할 때 서버가 맞춰 두는 호환 컬럼들.
 *
 *  - `price`: 옵션이 있으면 가장 싼 옵션 가격(`optionsMinPrice`).
 *  - `image_url`: 첫 이미지(= 커버). 장바구니·주문 메일·옛 코드가 이것만 읽는다.
 *  - `in_stock`: `status === 'available'`. 개요의 "판매 중 상품" 수와
 *    마이그레이션 전 코드의 판정이 계속 맞게.
 */
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
