"use client";

import { useEffect, useRef, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { formatPrice, formatPriceRange } from '@/lib/price';
import { adminFetch, errorMessage, uploadToCloudinary, type SignResponse } from '@/lib/admin/client';
import { moveItem } from '@/lib/admin/reorder';
import {
  changedFields,
  draftFromProduct,
  EMPTY_PRODUCT_DRAFT,
  newOptionId,
  payloadFromDraft,
  type AdminProductRow,
  type DraftImage,
  type DraftOption,
  type ProductDraft,
} from '@/lib/admin/product-draft';
import {
  IMAGE_LABELS,
  MAX_IMAGE_LABEL,
  MAX_IMAGES,
  MAX_OPTION_LABEL,
  MAX_OPTIONS,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUSES,
  SHOP_READY_MIGRATION,
  optionsMinPrice,
  parseImages,
  parseOptions,
  priceRange,
  productStatus,
  publicState,
  type ProductStatus,
} from '@/lib/product';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { BTN_SM, CHECKBOX_CLASS, CHIP_KO, ICON_BTN_CLASS, INPUT_CLASS, INPUT_COMPACT, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 샵 상품 관리. 저장하면 홈·샵 목록·상품 상세·sitemap이 다시 구워진다
 * (`lib/admin/revalidate.ts`).
 *
 * 이미지는 사진 업로드와 같은 방식으로 브라우저가 Cloudinary에 직접 올린다 —
 * 서명만 서버(`api/admin/products/sign`)에서 받고, 폴더는 `phorage/shop`으로
 * 고정이다. 첫 장이 커버이고, 서버가 `image_url`을 첫 장으로 맞춘다.
 *
 * 입력 ↔ 본문 변환은 `lib/admin/product-draft.ts`에 있다(테스트가 있다).
 */

const STATUS_HELP: Record<ProductStatus, string> = {
  draft: '공개 화면 어디에도 보이지 않습니다. 상품 주소로 들어와도 404입니다.',
  available: '샵에 보이고 장바구니에 담깁니다.',
  sold_out: '샵에 “품절” 배지를 달고 남습니다. 담을 수는 없습니다.',
};

const STATUS_CHIP: Record<ProductStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'border-forest/25 bg-moss-wash text-forest',
  sold_out: 'border-cream-deep bg-cream text-secondary-foreground',
};

/** 이미지 설명 선택지의 "직접 입력" 값. 기본 선택지와 겹치지 않는다. */
const CUSTOM_LABEL = '__custom__';

export default function ShopTab() {
  const { params } = useAdminNav();
  const productParam = params.get('product');

  const [products, setProducts] = useState<AdminProductRow[] | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [shopMigrationPending, setShopMigrationPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** 편집 중인 상품. `'new'`는 새 상품. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ products: AdminProductRow[]; migrationPending: boolean; shopMigrationPending?: boolean }>(
          '/api/admin/products',
        );
        if (cancelled) return;
        setProducts(data.products);
        setMigrationPending(data.migrationPending);
        setShopMigrationPending(Boolean(data.shopMigrationPending));
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, '상품을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 개요의 "고치기"(`?product=`)로 들어오면 그 상품의 편집을 연다.
  const [seenProduct, setSeenProduct] = useState<string | null>(null);
  if (productParam && seenProduct !== productParam) {
    setSeenProduct(productParam);
    const id = Number(productParam);
    if (Number.isInteger(id) && id > 0) setEditing(id);
  }

  if (loadError && !products) return <p role="alert" className="py-8 text-center text-sm text-brick">{loadError}</p>;
  if (!products) return <LoadingLine />;

  const current = typeof editing === 'number' ? products.find(product => product.id === editing) : undefined;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="샵"
        title={`상품 ${products.length}개`}
        description="초안은 공개 화면에 보이지 않습니다. 판매 중으로 바꾸려면 가격(옵션이 있으면 재고 있는 옵션의 가격)이 있어야 합니다."
        actions={
          editing === null && (
            <button type="button" onClick={() => { setEditing('new'); setMessage(null); }} className={`btn-primary ${BTN_SM}`}>
              + 새 상품
            </button>
          )
        }
      />
      {migrationPending && <MigrationNotice feature="상품 정렬 순서" />}
      {shopMigrationPending && (
        <MigrationNotice feature="상품 상태(초안·품절)·여러 장 이미지·옵션·에디션" file={SHOP_READY_MIGRATION} />
      )}
      <StatusLine message={message} />

      {editing !== null && (editing === 'new' || current) && (
        <ProductEditor
          key={String(editing)}
          product={current}
          migrationPending={migrationPending}
          shopMigrationPending={shopMigrationPending}
          onClose={() => setEditing(null)}
          onSaved={text => {
            setMessage({ tone: 'ok', text });
            setEditing(null);
            setReloadKey(k => k + 1);
          }}
        />
      )}

      {products.length === 0 ? (
        <EmptyLine>상품이 없습니다.</EmptyLine>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(product => {
            const status = productStatus(product);
            const shown = publicState(product);
            const imageCount = parseImages(product.images, product.image_url).length;
            const optionCount = parseOptions(product.options).length;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => { setEditing(product.id); setMessage(null); }}
                  aria-pressed={editing === product.id}
                  className={`card-hair flex w-full gap-3 p-3 text-left ${editing === product.id ? 'border-forest/50' : ''}`}
                >
                  {/* 자르지 않는다 — 칸 안에서 사진 비율대로. */}
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center">
                    {product.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cloudinary(product.image_url, { width: 200 })} alt="" loading="lazy" className="max-h-full max-w-full rounded-md" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate font-serif text-base font-medium tracking-tight text-ink">{product.name}</span>
                    <span className={`block text-sm tabular-nums ${product.price > 0 ? 'text-forest' : 'text-muted-foreground'}`}>
                      {formatPriceRange(priceRange(product))}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <span className={`chip ${CHIP_KO} ${STATUS_CHIP[status]}`}>{PRODUCT_STATUS_LABEL[status]}</span>
                      {/* 저장된 상태와 방문자가 보는 상태가 다를 때(판매 중인데 옵션이
                          전부 품절, 판매 중인데 가격 없음) 그 차이를 적는다. */}
                      {status === 'available' && shown !== 'available' && (
                        <span className={`chip ${CHIP_KO} border-brick-soft text-brick`}>
                          {shown === 'sold_out' ? '옵션 모두 품절' : '가격 확인'}
                        </span>
                      )}
                      {imageCount > 1 && <span className={`chip ${CHIP_KO}`}>사진 {imageCount}</span>}
                      {optionCount > 0 && <span className={`chip ${CHIP_KO}`}>옵션 {optionCount}</span>}
                      {product.category && <span className="chip">{product.category}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── 편집기 ───────────────────────────────────────────────────────────────────

function ProductEditor({
  product,
  migrationPending,
  shopMigrationPending,
  onClose,
  onSaved,
}: {
  product?: AdminProductRow;
  migrationPending: boolean;
  shopMigrationPending: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(product ? draftFromProduct(product) : EMPTY_PRODUCT_DRAFT);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const setImages = (update: (images: DraftImage[]) => DraftImage[]) => setDraft(prev => ({ ...prev, images: update(prev.images) }));
  const setOptions = (update: (options: DraftOption[]) => DraftOption[]) => setDraft(prev => ({ ...prev, options: update(prev.options) }));

  const hasOptions = draft.options.length > 0;
  const priceValid = /^\d+$/.test(draft.price.trim());
  const sortValid = /^-?\d+$/.test(draft.sort_order.trim());
  // 마이그레이션 전에는 이미지가 `image_url` 한 장뿐이다 — 올리면 갈아 끼운다.
  const maxImages = shopMigrationPending ? 1 : MAX_IMAGES;

  async function upload(files: File[]) {
    const room = maxImages === 1 ? 1 : Math.max(0, maxImages - draft.images.length);
    const batch = files.slice(0, room);
    if (batch.length === 0) return setError(`이미지는 ${maxImages}장까지 올릴 수 있습니다.`);
    setUploading(batch.length);
    setError(null);
    try {
      const sign = await adminFetch<SignResponse>('/api/admin/products/sign', 'POST', {});
      for (const file of batch) {
        const uploaded = await uploadToCloudinary(file, sign);
        setImages(images => {
          const next = { url: uploaded.secure_url, label: '', custom: false };
          if (maxImages === 1) return [next];
          return images.some(image => image.url === next.url) ? images : [...images, next];
        });
        setUploading(n => Math.max(0, n - 1));
      }
      if (files.length > batch.length) setError(`이미지는 ${maxImages}장까지라 ${files.length - batch.length}장은 올리지 않았습니다.`);
    } catch (e) {
      setError(errorMessage(e, '이미지를 올리지 못했습니다.'));
    } finally {
      setUploading(0);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const includeSortOrder = !migrationPending;
    const result = payloadFromDraft(draft, { includeSortOrder });
    if (!result.ok) return setError(result.error);

    let body: Record<string, unknown> = { ...result.body };
    if (product) {
      // 바뀐 필드만 보낸다. 기준은 지금 행을 같은 함수로 본문으로 만든 것 —
      // 입력칸 문자열과 DB 숫자를 직접 비교하면 "35000" ≠ 35000으로 헛돈다.
      const before = payloadFromDraft(draftFromProduct(product), { includeSortOrder });
      if (before.ok) {
        body = changedFields(before.body, result.body);
        if (Object.keys(body).length === 0) return setError('바뀐 내용이 없습니다.');
      }
      body.id = product.id;
    }

    setSaving(true);
    setError(null);
    try {
      await adminFetch('/api/admin/products', product ? 'PATCH' : 'POST', body);
      onSaved(product ? `“${result.body.name}”을 저장했습니다.` : `“${result.body.name}”을 추가했습니다.`);
    } catch (e) {
      setError(errorMessage(e, '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product) return;
    const ok = await confirm({
      title: `“${product.name}”을 지울까요?`,
      body: (
        <>
          <p>샵과 상품 페이지에서 사라집니다. 이미 들어온 주문의 내역은 그대로 남습니다.</p>
          <p className="text-slate">잠시 내리려면 상태를 &ldquo;초안&rdquo;으로, 다 팔렸으면 &ldquo;품절&rdquo;로 두는 쪽이 맞습니다.</p>
        </>
      ),
      confirmLabel: '상품 지우기',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await adminFetch('/api/admin/products', 'DELETE', { id: product.id });
      onSaved(`“${product.name}”을 지웠습니다.`);
    } catch (e) {
      setError(errorMessage(e, '지우지 못했습니다.'));
      setSaving(false);
    }
  }

  const id = product ? `product-${product.id}` : 'product-new';
  const busy = saving || uploading > 0;

  return (
    <form onSubmit={save} className={`${PANEL_CLASS} space-y-6 p-5 md:p-6`}>
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <p className="label-ko eyebrow-marked text-muted-foreground">{product ? '상품 편집' : '새 상품'}</p>
        <button type="button" onClick={onClose} className={`btn-ghost ${BTN_SM} text-slate`}>닫기</button>
      </div>

      {/* ── 기본 정보 ── */}
      <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className={LABEL_CLASS}>상품명</label>
          <input id={`${id}-name`} className={INPUT_CLASS} value={draft.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-status`} className={LABEL_CLASS}>상태</label>
          <select
            id={`${id}-status`}
            className={INPUT_CLASS}
            value={draft.status}
            aria-describedby={`${id}-status-help`}
            onChange={e => set('status', e.target.value as ProductStatus)}
          >
            {PRODUCT_STATUSES.map(status => (
              <option key={status} value={status}>{PRODUCT_STATUS_LABEL[status]}</option>
            ))}
          </select>
          <p id={`${id}-status-help`} className="mt-1 text-[12px] text-muted-foreground">
            {STATUS_HELP[draft.status]}
            {shopMigrationPending && draft.status === 'sold_out' && ' (마이그레이션 전에는 초안처럼 숨겨집니다.)'}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-price`} className={LABEL_CLASS}>가격 (원)</label>
          <input
            id={`${id}-price`}
            inputMode="numeric"
            className={`${INPUT_CLASS} tabular-nums`}
            value={hasOptions ? String(optionsMinPrice(draft.options.map(o => ({ ...o, price: Number(o.price) || 0 })))) : draft.price}
            aria-invalid={!hasOptions && !priceValid}
            aria-describedby={`${id}-price-help`}
            disabled={hasOptions}
            onChange={e => set('price', e.target.value.replace(/[,\s₩]/g, ''))}
          />
          <p id={`${id}-price-help`} className="mt-1 text-[12px] text-muted-foreground">
            {hasOptions
              ? '옵션 가격 중 가장 낮은 값으로 저장됩니다. 주문은 고른 옵션의 가격입니다.'
              : priceValid
              ? formatPrice(Number(draft.price))
              : '숫자만 적어 주세요'}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-edition`} className={LABEL_CLASS}>에디션 (선택)</label>
          <input
            id={`${id}-edition`}
            className={INPUT_CLASS}
            value={draft.edition}
            maxLength={60}
            disabled={shopMigrationPending}
            onChange={e => set('edition', e.target.value)}
            placeholder="한정 30부"
          />
        </div>
        <div>
          <label htmlFor={`${id}-sort`} className={LABEL_CLASS}>정렬 순서</label>
          <input
            id={`${id}-sort`}
            inputMode="numeric"
            className={`${INPUT_CLASS} tabular-nums`}
            value={draft.sort_order}
            aria-invalid={!sortValid}
            disabled={migrationPending}
            onChange={e => set('sort_order', e.target.value)}
          />
          <p className="mt-1 text-[12px] text-muted-foreground">작을수록 앞에 나옵니다.</p>
        </div>
        <div>
          <label htmlFor={`${id}-category`} className={LABEL_CLASS}>카테고리</label>
          <input id={`${id}-category`} className={INPUT_CLASS} value={draft.category} onChange={e => set('category', e.target.value)} placeholder="Print" />
        </div>
        <div>
          <label htmlFor={`${id}-tag`} className={LABEL_CLASS}>태그 (선택)</label>
          <input id={`${id}-tag`} className={INPUT_CLASS} value={draft.tag} onChange={e => set('tag', e.target.value)} placeholder="New" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-description`} className={LABEL_CLASS}>설명</label>
          <textarea id={`${id}-description`} rows={4} className={INPUT_CLASS} value={draft.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>

      {/* ── 이미지 ── */}
      {/* `legend`는 fieldset의 첫 자식이어야 그룹 이름이 된다 — div 안에 넣으면
          평범한 글자가 된다. */}
      <fieldset className="space-y-3 border-t border-border pt-5">
        <legend className="label-ko float-left w-full text-ink">
          이미지 <span className="tabular-nums text-muted-foreground">{draft.images.length}/{maxImages}</span>
        </legend>
        <div className="clear-both flex flex-wrap items-end justify-between gap-2">
          <p className="text-[12px] text-muted-foreground">첫 장이 커버입니다(목록·장바구니·공유 카드). 상세 페이지에는 이 순서대로 나옵니다.</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0 || (maxImages > 1 && draft.images.length >= maxImages)}
            className={`btn-outline ${BTN_SM}`}
          >
            {uploading > 0 ? `올리는 중… (${uploading})` : maxImages === 1 && draft.images.length ? '이미지 바꾸기' : '+ 이미지 올리기'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={maxImages > 1}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void upload(files);
              e.target.value = '';
            }}
          />
        </div>

        {draft.images.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            {uploading > 0 ? '올리는 중…' : '이미지 없음 — 한 장 이상 올려 주세요.'}
          </p>
        ) : (
          <ol className="space-y-2">
            {draft.images.map((image, index) => {
              const choice = image.custom ? CUSTOM_LABEL : image.label;
              const name = `${index + 1}번째 이미지`;
              return (
                <li key={image.url} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-2 sm:flex-nowrap">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <button type="button" onClick={() => setImages(list => moveItem(list, index, index - 1))} disabled={index === 0} aria-label={`${name} 앞으로`} className={ICON_BTN_CLASS}>↑</button>
                    <button type="button" onClick={() => setImages(list => moveItem(list, index, index + 1))} disabled={index === draft.images.length - 1} aria-label={`${name} 뒤로`} className={ICON_BTN_CLASS}>↓</button>
                  </div>
                  {/* 높이만 맞추고 폭은 사진 비율대로 — 편집기에서 본 모양이 상세 페이지의 모양이다. */}
                  <span className="flex h-20 w-24 shrink-0 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cloudinary(image.url, { width: 240 })} alt="" className="max-h-full max-w-full rounded-md border border-border" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 ? (
                        <span className={`chip ${CHIP_KO} border-forest/25 bg-moss-wash text-forest`}>커버</span>
                      ) : (
                        <button type="button" onClick={() => setImages(list => moveItem(list, index, 0))} className={`btn-ghost ${BTN_SM} px-2 py-1 text-slate`}>
                          커버로
                        </button>
                      )}
                      <select
                        aria-label={`${name} 설명`}
                        className={`${INPUT_COMPACT} w-auto`}
                        value={choice}
                        disabled={shopMigrationPending}
                        onChange={e => {
                          const value = e.target.value;
                          setImages(list =>
                            list.map((item, i) =>
                              i !== index ? item : value === CUSTOM_LABEL ? { ...item, custom: true, label: '' } : { ...item, custom: false, label: value },
                            ),
                          );
                        }}
                      >
                        <option value="">설명 없음</option>
                        {IMAGE_LABELS.map(label => <option key={label} value={label}>{label}</option>)}
                        <option value={CUSTOM_LABEL}>직접 입력…</option>
                      </select>
                      {image.custom && (
                        <input
                          aria-label={`${name} 설명 직접 입력`}
                          className={`${INPUT_COMPACT} w-auto min-w-0 flex-1`}
                          value={image.label}
                          maxLength={MAX_IMAGE_LABEL}
                          placeholder="예: 액자에 넣은 모습"
                          onChange={e => setImages(list => list.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))}
                        />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImages(list => list.filter((_, i) => i !== index))}
                    aria-label={`${name} 빼기`}
                    className={`btn-ghost ${BTN_SM} shrink-0 text-brick`}
                  >
                    빼기
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </fieldset>

      {/* ── 옵션 ── */}
      <fieldset className="space-y-3 border-t border-border pt-5" disabled={shopMigrationPending}>
        <legend className="label-ko float-left w-full text-ink">
          옵션 <span className="tabular-nums text-muted-foreground">{draft.options.length}/{MAX_OPTIONS}</span>
        </legend>
        <div className="clear-both flex flex-wrap items-end justify-between gap-2">
          <p className="max-w-xl text-[12px] text-muted-foreground">
            크기·용지처럼 고르는 것이 있으면 추가합니다. 옵션이 있으면 손님은 하나를 반드시 고르고, 그 옵션의 가격으로 주문합니다.
          </p>
          <button
            type="button"
            disabled={draft.options.length >= MAX_OPTIONS}
            onClick={() =>
              setOptions(list => [
                ...list,
                { id: newOptionId(list.map(option => option.id)), label: '', price: list.at(-1)?.price ?? '0', in_stock: true },
              ])
            }
            className={`btn-outline ${BTN_SM}`}
          >
            + 옵션 추가
          </button>
        </div>

        {draft.options.length > 0 && (
          <ol className="space-y-2">
            {draft.options.map((option, index) => {
              const name = option.label.trim() || `${index + 1}번째 옵션`;
              const optionPriceValid = /^\d+$/.test(option.price.trim());
              const update = (patch: Partial<DraftOption>) =>
                setOptions(list => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
              return (
                <li key={option.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-2 sm:flex-nowrap">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <button type="button" onClick={() => setOptions(list => moveItem(list, index, index - 1))} disabled={index === 0} aria-label={`${name} 위로`} className={ICON_BTN_CLASS}>↑</button>
                    <button type="button" onClick={() => setOptions(list => moveItem(list, index, index + 1))} disabled={index === draft.options.length - 1} aria-label={`${name} 아래로`} className={ICON_BTN_CLASS}>↓</button>
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <label htmlFor={`${id}-opt-${option.id}-label`} className="sr-only">{index + 1}번째 옵션 이름</label>
                    <input
                      id={`${id}-opt-${option.id}-label`}
                      className={INPUT_COMPACT}
                      value={option.label}
                      maxLength={MAX_OPTION_LABEL}
                      placeholder="A3 · 매트지"
                      onChange={e => update({ label: e.target.value })}
                    />
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">id {option.id}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <label htmlFor={`${id}-opt-${option.id}-price`} className="sr-only">{name} 가격(원)</label>
                    <input
                      id={`${id}-opt-${option.id}-price`}
                      inputMode="numeric"
                      className={`${INPUT_COMPACT} tabular-nums`}
                      value={option.price}
                      aria-invalid={!optionPriceValid}
                      onChange={e => update({ price: e.target.value.replace(/[,\s₩]/g, '') })}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">{optionPriceValid ? formatPrice(Number(option.price)) : '숫자만'}</p>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[13px] text-ink-body">
                    <input type="checkbox" className={CHECKBOX_CLASS} checked={option.in_stock} onChange={e => update({ in_stock: e.target.checked })} />
                    <span className="sr-only">{name} </span>재고 있음
                  </label>
                  <button
                    type="button"
                    onClick={() => setOptions(list => list.filter((_, i) => i !== index))}
                    aria-label={`${name} 빼기`}
                    className={`btn-ghost ${BTN_SM} shrink-0 text-brick`}
                  >
                    빼기
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </fieldset>

      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {product ? (
          <button type="button" onClick={() => void remove()} disabled={saving} className={`btn-ghost ${BTN_SM} text-brick`}>
            상품 지우기
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={busy} className={`btn-primary ${BTN_SM}`}>
          {saving ? '저장 중…' : product ? '저장' : '상품 추가'}
        </button>
      </div>
    </form>
  );
}
