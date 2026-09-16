"use client";

import { useEffect, useRef, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { formatPrice } from '@/lib/price';
import { adminFetch, errorMessage, uploadToCloudinary, type SignResponse } from '@/lib/admin/client';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { BTN_SM, CHECKBOX_CLASS, CHIP_KO, INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 샵 상품 관리. 저장하면 홈·샵 목록·상품 상세가 다시 구워진다
 * (`lib/admin/revalidate.ts`).
 *
 * 이미지는 사진 업로드와 같은 방식으로 브라우저가 Cloudinary에 직접 올린다 —
 * 서명만 서버(`api/admin/products/sign`)에서 받고, 폴더는 `phorage/shop`으로
 * 고정이다.
 */

interface ProductRow {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string | null;
  tag: string | null;
  description: string | null;
  in_stock: boolean;
  sort_order?: number;
}

type Draft = {
  name: string;
  price: string;
  category: string;
  tag: string;
  description: string;
  in_stock: boolean;
  sort_order: string;
  image_url: string;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  price: '0',
  category: '',
  tag: '',
  description: '',
  in_stock: false,
  sort_order: '0',
  image_url: '',
};

function toDraft(product: ProductRow): Draft {
  return {
    name: product.name,
    price: String(product.price),
    category: product.category ?? '',
    tag: product.tag ?? '',
    description: product.description ?? '',
    in_stock: product.in_stock,
    sort_order: String(product.sort_order ?? 0),
    image_url: product.image_url ?? '',
  };
}

export default function ShopTab() {
  const { params } = useAdminNav();
  const productParam = params.get('product');

  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** 편집 중인 상품. `'new'`는 새 상품. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ products: ProductRow[]; migrationPending: boolean }>('/api/admin/products');
        if (cancelled) return;
        setProducts(data.products);
        setMigrationPending(data.migrationPending);
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
        description="가격이 0원이면 샵에 “가격 미정”으로 보입니다. 판매 중으로 켜기 전에 가격을 확인해 주세요."
        actions={
          editing === null && (
            <button type="button" onClick={() => { setEditing('new'); setMessage(null); }} className={`btn-primary ${BTN_SM}`}>
              + 새 상품
            </button>
          )
        }
      />
      {migrationPending && <MigrationNotice feature="상품 정렬 순서" />}
      <StatusLine message={message} />

      {editing !== null && (editing === 'new' || current) && (
        <ProductEditor
          key={String(editing)}
          product={current}
          migrationPending={migrationPending}
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
          {products.map(product => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => { setEditing(product.id); setMessage(null); }}
                aria-pressed={editing === product.id}
                className={`card-hair flex w-full gap-3 p-3 text-left ${editing === product.id ? 'border-forest/50' : ''}`}
              >
                <span className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-stone">
                  {product.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cloudinary(product.image_url, { width: 200 })} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-serif text-base font-medium tracking-tight text-ink">{product.name}</span>
                  <span className={`block text-sm ${product.price > 0 ? 'text-forest' : 'text-muted-foreground'}`}>
                    {formatPrice(product.price)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <span className={`chip ${CHIP_KO} ${product.in_stock ? 'border-forest/25 bg-moss-wash text-forest' : 'bg-muted text-muted-foreground'}`}>
                      {product.in_stock ? '판매 중' : '품절'}
                    </span>
                    {product.in_stock && product.price <= 0 && (
                      <span className={`chip ${CHIP_KO} border-brick-soft text-brick`}>가격 확인</span>
                    )}
                    {product.category && <span className="chip">{product.category}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 편집기 ───────────────────────────────────────────────────────────────────

function ProductEditor({
  product,
  migrationPending,
  onClose,
  onSaved,
}: {
  product?: ProductRow;
  migrationPending: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(product ? toDraft(product) : EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const priceValid = /^\d+$/.test(draft.price.trim());
  const sortValid = /^-?\d+$/.test(draft.sort_order.trim());

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const sign = await adminFetch<SignResponse>('/api/admin/products/sign', 'POST', {});
      const uploaded = await uploadToCloudinary(file, sign);
      set('image_url', uploaded.secure_url);
    } catch (e) {
      setError(errorMessage(e, '이미지를 올리지 못했습니다.'));
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return setError('상품명을 적어 주세요.');
    if (!priceValid) return setError('가격은 0 이상의 정수(원)로 적어 주세요.');
    if (!sortValid) return setError('정렬 순서는 정수로 적어 주세요.');
    if (!draft.image_url) return setError('상품 이미지를 올려 주세요.');

    const full = {
      name: draft.name.trim(),
      price: Number(draft.price),
      category: draft.category.trim(),
      tag: draft.tag.trim(),
      description: draft.description.trim(),
      in_stock: draft.in_stock,
      image_url: draft.image_url,
      ...(migrationPending ? {} : { sort_order: Number(draft.sort_order) }),
    };

    let body: Record<string, unknown> = full;
    if (product) {
      // 바뀐 필드만 보낸다.
      const before = toDraft(product);
      body = Object.fromEntries(
        Object.entries(full).filter(([key, value]) => {
          const old = before[key as keyof Draft];
          return String(value) !== String(typeof old === 'string' ? old.trim() : old);
        }),
      );
      if (Object.keys(body).length === 0) return setError('바뀐 내용이 없습니다.');
      body.id = product.id;
    }

    setSaving(true);
    setError(null);
    try {
      await adminFetch('/api/admin/products', product ? 'PATCH' : 'POST', body);
      onSaved(product ? `“${full.name}”을 저장했습니다.` : `“${full.name}”을 추가했습니다.`);
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
          <p className="text-slate">판매만 멈추려면 &ldquo;판매 중&rdquo;을 끄는 쪽이 맞습니다.</p>
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

  return (
    <form onSubmit={save} className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <p className="label-ko eyebrow-marked text-muted-foreground">{product ? '상품 편집' : '새 상품'}</p>
        <button type="button" onClick={onClose} className={`btn-ghost ${BTN_SM} text-slate`}>닫기</button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[14rem_1fr]">
        <div className="space-y-2">
          <span className={LABEL_CLASS}>이미지</span>
          <div className="aspect-square overflow-hidden rounded-lg border border-border bg-stone">
            {draft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cloudinary(draft.image_url, { width: 480 })} alt="" className={`h-full w-full object-cover ${uploading ? 'animate-pulse opacity-60' : ''}`} />
            ) : (
              <span className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                {uploading ? '올리는 중…' : '이미지 없음'}
              </span>
            )}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`btn-outline ${BTN_SM} w-full`}>
            {uploading ? '올리는 중…' : draft.image_url ? '이미지 바꾸기' : '이미지 올리기'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-name`} className={LABEL_CLASS}>상품명</label>
            <input id={`${id}-name`} className={INPUT_CLASS} value={draft.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-price`} className={LABEL_CLASS}>가격 (원)</label>
            <input
              id={`${id}-price`}
              inputMode="numeric"
              className={`${INPUT_CLASS} tabular-nums`}
              value={draft.price}
              aria-invalid={!priceValid}
              onChange={e => set('price', e.target.value.replace(/[,\s₩]/g, ''))}
            />
            <p className="mt-1 text-[12px] text-muted-foreground">
              {priceValid ? formatPrice(Number(draft.price)) : '숫자만 적어 주세요'}
            </p>
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
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-body sm:col-span-2">
            <input type="checkbox" className={CHECKBOX_CLASS} checked={draft.in_stock} onChange={e => set('in_stock', e.target.checked)} />
            판매 중 (끄면 &ldquo;품절&rdquo;로 보이고 장바구니에 담기지 않습니다)
          </label>
          {draft.in_stock && priceValid && Number(draft.price) === 0 && (
            <p className="text-[13px] text-brick sm:col-span-2">가격이 0원인 채로 판매 중입니다.</p>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {product ? (
          <button type="button" onClick={() => void remove()} disabled={saving} className={`btn-ghost ${BTN_SM} text-brick`}>
            상품 지우기
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={saving || uploading} className={`btn-primary ${BTN_SM}`}>
          {saving ? '저장 중…' : product ? '저장' : '상품 추가'}
        </button>
      </div>
    </form>
  );
}
