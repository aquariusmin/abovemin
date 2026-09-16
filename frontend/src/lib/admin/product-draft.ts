import {
  availabilityProblem,
  IMAGE_LABELS,
  MAX_IMAGE_LABEL,
  MAX_OPTION_LABEL,
  OPTION_ID_RE,
  optionsMinPrice,
  parseImages,
  parseOptions,
  productStatus,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from '@/lib/product';

/**
 * 관리 화면 상품 편집기의 입력 상태 ↔ API 본문. **브라우저 전용 계산**이지만
 * DOM과 무관해서 여기로 뺐다 — 입력칸은 문자열인데 API는 숫자·배열을 받고,
 * 저장할 때는 바뀐 필드만 보낸다. 그 변환에서 틀리기 쉽다(가격 "35,000",
 * 비운 이미지 설명, 순서만 바뀐 옵션).
 *
 * 서버가 같은 규칙으로 다시 검사한다(`lib/admin/schemas.ts`, `api/admin/products`).
 * 여기의 검사는 왕복 없이 바로 알려 주려는 것이다.
 */

export interface DraftImage {
  url: string;
  label: string;
  /** 기본 선택지 밖의 설명을 직접 적는 중인가. 비어 있어도 입력칸을 유지한다. */
  custom: boolean;
}

export interface DraftOption {
  id: string;
  label: string;
  price: string;
  in_stock: boolean;
}

export interface ProductDraft {
  name: string;
  price: string;
  category: string;
  tag: string;
  description: string;
  status: ProductStatus;
  edition: string;
  sort_order: string;
  images: DraftImage[];
  options: DraftOption[];
}

/** 관리 API(`GET /api/admin/products`)가 돌려주는 행. 새 컬럼은 적용 전에 없다. */
export interface AdminProductRow {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string | null;
  tag: string | null;
  description: string | null;
  in_stock: boolean;
  sort_order?: number;
  status?: string | null;
  images?: unknown;
  options?: unknown;
  edition?: string | null;
}

export const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: '',
  price: '0',
  category: '',
  tag: '',
  description: '',
  // 새 상품은 초안이다 — 가격을 확인하기 전에 샵에 걸리지 않게.
  status: 'draft',
  edition: '',
  sort_order: '0',
  images: [],
  options: [],
};

function isPresetLabel(label: string): boolean {
  return (IMAGE_LABELS as readonly string[]).includes(label);
}

export function draftFromProduct(row: AdminProductRow): ProductDraft {
  return {
    name: row.name,
    price: String(row.price),
    category: row.category ?? '',
    tag: row.tag ?? '',
    description: row.description ?? '',
    status: productStatus(row),
    edition: row.edition ?? '',
    sort_order: String(row.sort_order ?? 0),
    images: parseImages(row.images, row.image_url).map(image => ({
      url: image.url,
      label: image.label ?? '',
      custom: Boolean(image.label) && !isPresetLabel(image.label ?? ''),
    })),
    options: parseOptions(row.options).map(option => ({
      id: option.id,
      label: option.label,
      price: String(option.price),
      in_stock: option.in_stock,
    })),
  };
}

export interface ProductPayload {
  name: string;
  price: number;
  category: string;
  tag: string;
  description: string;
  status: ProductStatus;
  edition: string;
  image_url: string;
  images: ProductImage[];
  options: ProductOption[];
  sort_order?: number;
}

export type PayloadResult = { ok: true; body: ProductPayload } | { ok: false; error: string };

const INT_RE = /^\d+$/;

/** 입력 → 본문. 사람이 고칠 수 있는 첫 문제를 한국어로 돌려준다. */
export function payloadFromDraft(draft: ProductDraft, { includeSortOrder }: { includeSortOrder: boolean }): PayloadResult {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: '상품명을 적어 주세요.' };
  const priceText = draft.price.trim();
  if (draft.options.length === 0 && !INT_RE.test(priceText)) {
    return { ok: false, error: '가격은 0 이상의 정수(원)로 적어 주세요.' };
  }
  if (includeSortOrder && !/^-?\d+$/.test(draft.sort_order.trim())) {
    return { ok: false, error: '정렬 순서는 정수로 적어 주세요.' };
  }
  if (draft.images.length === 0) return { ok: false, error: '상품 이미지를 한 장 이상 올려 주세요.' };

  const images: ProductImage[] = [];
  for (const [i, image] of draft.images.entries()) {
    const label = image.label.trim();
    if (label.length > MAX_IMAGE_LABEL) {
      return { ok: false, error: `${i + 1}번째 이미지 설명은 ${MAX_IMAGE_LABEL}자까지입니다.` };
    }
    images.push({ url: image.url, label: label || null });
  }

  const options: ProductOption[] = [];
  for (const [i, option] of draft.options.entries()) {
    const label = option.label.trim();
    if (!label) return { ok: false, error: `${i + 1}번째 옵션의 이름을 적어 주세요.` };
    if (label.length > MAX_OPTION_LABEL) return { ok: false, error: `${i + 1}번째 옵션 이름은 ${MAX_OPTION_LABEL}자까지입니다.` };
    if (!INT_RE.test(option.price.trim())) {
      return { ok: false, error: `“${label}” 옵션의 가격은 0 이상의 정수(원)로 적어 주세요.` };
    }
    if (!OPTION_ID_RE.test(option.id)) return { ok: false, error: `“${label}” 옵션의 id가 올바르지 않습니다.` };
    options.push({ id: option.id, label, price: Number(option.price.trim()), in_stock: option.in_stock });
  }

  // 옵션이 있으면 상품 가격 칸은 쓰지 않는다 — 서버가 가장 싼 옵션 값으로 맞춘다.
  // 여기서도 같게 맞춰 두어야 "바뀐 필드" 비교가 헛돌지 않는다.
  const price = options.length ? optionsMinPrice(options) : Number(priceText);
  const problem = availabilityProblem({ status: draft.status, price, options });
  if (problem) return { ok: false, error: problem };

  return {
    ok: true,
    body: {
      name,
      price,
      category: draft.category.trim(),
      tag: draft.tag.trim(),
      description: draft.description.trim(),
      status: draft.status,
      edition: draft.edition.trim(),
      image_url: images[0].url,
      images,
      options,
      ...(includeSortOrder ? { sort_order: Number(draft.sort_order.trim()) } : {}),
    },
  };
}

/** 저장할 때 보낼 필드: 값이 달라진 것만. 배열은 순서까지 비교한다(순서도 내용이다). */
export function changedFields(before: ProductPayload, after: ProductPayload): Partial<ProductPayload> {
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after)) {
    if (JSON.stringify(value) !== JSON.stringify(before[key as keyof ProductPayload])) changed[key] = value;
  }
  return changed as Partial<ProductPayload>;
}

/**
 * 새 옵션의 id. 라벨에서 만들지 않는다 — 라벨은 한국어이고("A3 · 매트지"),
 * 라벨을 고쳐도 id는 그대로여야 장바구니에 담긴 줄이 계속 맞는다.
 */
export function newOptionId(existing: readonly string[], random: () => number = Math.random): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = `opt-${Math.floor(random() * 36 ** 5).toString(36).padStart(5, '0')}`;
    if (!taken.has(id)) return id;
  }
  // 난수가 스무 번 겹칠 일은 없지만, 무한 반복으로 화면이 멈추는 것보다 낫다.
  let n = taken.size + 1;
  while (taken.has(`opt-${n}`)) n++;
  return `opt-${n}`;
}
