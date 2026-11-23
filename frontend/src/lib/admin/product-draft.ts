import {
  availabilityProblem,
  IMAGE_LABELS,
  MAX_ADDONS,
  MAX_IMAGE_LABEL,
  MAX_OPTION_LABEL,
  MAX_RELATED,
  OPTION_ID_RE,
  optionsMinPrice,
  parseAddons,
  parseImages,
  parseOptions,
  parseRelatedIds,
  productStatus,
  type ProductAddon,
  type ProductImage,
  type ProductOption,
  type ProductStatus,
} from '@/lib/product';

// 서버가 같은 규칙으로 다시 검사한다(schemas.ts). 여기는 왕복 없이 바로 알려 주려는 것이다.

export interface DraftImage {
  url: string;
  label: string;
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
  addons: DraftOption[];
  related_ids: number[];
}

// 새 컬럼은 마이그레이션 적용 전에 없다.
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
  // 20261014010000_product_addons 이후 컬럼.
  addons?: unknown;
  related_ids?: unknown;
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
  addons: [],
  related_ids: [],
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
    options: parseOptions(row.options).map(draftChoice),
    addons: parseAddons(row.addons).map(draftChoice),
    // 지워진 상품 id도 둔다 — 편집기가 "지워진 상품"으로 보여 주고 관리자가 뺄 수 있게.
    related_ids: parseRelatedIds(row.related_ids, row.id),
  };
}

function draftChoice(choice: ProductOption): DraftOption {
  return { id: choice.id, label: choice.label, price: String(choice.price), in_stock: choice.in_stock };
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
  addons: ProductAddon[];
  related_ids: number[];
  sort_order?: number;
}

export type PayloadResult = { ok: true; body: ProductPayload } | { ok: false; error: string };

const INT_RE = /^\d+$/;

function pricedChoices(list: readonly DraftOption[], noun: string): { ok: true; value: ProductOption[] } | { ok: false; error: string } {
  const value: ProductOption[] = [];
  for (const [i, entry] of list.entries()) {
    const label = entry.label.trim();
    if (!label) return { ok: false, error: `${i + 1}번째 ${noun}의 이름을 적어 주세요.` };
    if (label.length > MAX_OPTION_LABEL) return { ok: false, error: `${i + 1}번째 ${noun} 이름은 ${MAX_OPTION_LABEL}자까지입니다.` };
    if (!INT_RE.test(entry.price.trim())) {
      return { ok: false, error: `“${label}” ${noun}의 가격은 0 이상의 정수(원)로 적어 주세요.` };
    }
    if (!OPTION_ID_RE.test(entry.id)) return { ok: false, error: `“${label}” ${noun}의 id가 올바르지 않습니다.` };
    value.push({ id: entry.id, label, price: Number(entry.price.trim()), in_stock: entry.in_stock });
  }
  return { ok: true, value };
}

// selfId: 함께 구매에 자기 자신이 들어가지 않게 본다.
export function payloadFromDraft(
  draft: ProductDraft,
  { includeSortOrder, selfId }: { includeSortOrder: boolean; selfId?: number },
): PayloadResult {
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

  const parsedOptions = pricedChoices(draft.options, '옵션');
  if (!parsedOptions.ok) return parsedOptions;
  const options = parsedOptions.value;

  if (draft.addons.length > MAX_ADDONS) return { ok: false, error: `추가 상품은 ${MAX_ADDONS}개까지 둘 수 있습니다.` };
  const parsedAddons = pricedChoices(draft.addons, '추가 상품');
  if (!parsedAddons.ok) return parsedAddons;
  const addons = parsedAddons.value;

  const related_ids = draft.related_ids;
  if (related_ids.length > MAX_RELATED) return { ok: false, error: `함께 구매는 ${MAX_RELATED}개까지 고를 수 있습니다.` };
  if (new Set(related_ids).size !== related_ids.length) return { ok: false, error: '함께 구매에 같은 상품이 두 번 들어 있습니다.' };
  if (selfId !== undefined && related_ids.includes(selfId)) return { ok: false, error: '함께 구매에 이 상품 자신을 넣을 수 없습니다.' };

  // 옵션이 있으면 가격은 가장 싼 옵션 값 — 서버와 같게 맞춰야 바뀐 필드 비교가 헛돌지 않는다.
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
      addons,
      related_ids: [...related_ids],
      ...(includeSortOrder ? { sort_order: Number(draft.sort_order.trim()) } : {}),
    },
  };
}

// 배열은 순서까지 비교한다(순서도 내용이다).
export function changedFields(before: ProductPayload, after: ProductPayload): Partial<ProductPayload> {
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after)) {
    if (JSON.stringify(value) !== JSON.stringify(before[key as keyof ProductPayload])) changed[key] = value;
  }
  return changed as Partial<ProductPayload>;
}

// 라벨에서 만들지 않는다: 라벨을 고쳐도 id가 그대로여야 장바구니 줄이 맞는다.
export function newOptionId(existing: readonly string[], random: () => number = Math.random, prefix = 'opt'): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = `${prefix}-${Math.floor(random() * 36 ** 5).toString(36).padStart(5, '0')}`;
    if (!taken.has(id)) return id;
  }
  // 난수가 스무 번 겹칠 일은 없지만, 무한 반복으로 화면이 멈추는 것보다 낫다.
  let n = taken.size + 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

export function newAddonId(existing: readonly string[], random: () => number = Math.random): string {
  return newOptionId(existing, random, 'add');
}

// 초안도 고를 수 있다 — 공개 화면에는 판매를 시작한 뒤에 나타난다.
export function relatedCandidates<P extends { id: number }>(
  products: readonly P[],
  selected: readonly number[],
  selfId?: number,
): P[] {
  const taken = new Set(selected);
  return products.filter(product => product.id !== selfId && !taken.has(product.id));
}
