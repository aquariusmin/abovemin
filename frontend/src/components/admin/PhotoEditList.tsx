"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { INPUT_CLASS } from './adminStyles';

/**
 * 이미 올라간 사진의 관리 — 정보 수정, 순서 변경, 삭제.
 *
 * 정보 수정은 행 단위로 저장한다(바뀐 필드만 전송). 순서는 화면에서 여러 번
 * 옮긴 뒤 한 번에 저장한다 — 한 칸 옮길 때마다 요청을 보내면 되돌리기가
 * 어려워지고, 서버는 어차피 전체 순서를 받아야 한다(`api/admin/photos/order`).
 *
 * 사진 파일 자체를 바꾸는 것은 지원하지 않는다. 그건 수정이 아니라 새로 올리는
 * 일이라 위쪽 업로드 영역을 쓴다.
 */

interface PhotoRow {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
  sort_order: number;
}

interface Draft {
  title: string;
  location: string;
  year: string;
}

interface Props {
  albumSlug: string;
  /** 값이 바뀌면 목록을 다시 불러온다 — 업로드 저장 직후 새 사진을 보여주기 위함. */
  refreshToken: number;
}

function toDraft(photo: PhotoRow): Draft {
  return { title: photo.title, location: photo.location ?? '', year: String(photo.year) };
}

function isDirty(photo: PhotoRow, draft: Draft): boolean {
  return (
    draft.title !== photo.title ||
    draft.location !== (photo.location ?? '') ||
    draft.year !== String(photo.year)
  );
}

export default function PhotoEditList({ albumSlug, refreshToken }: Props) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  /** 화면에 보이는 순서. 저장 전까지는 서버 순서와 다를 수 있다. */
  const [order, setOrder] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [rowMessage, setRowMessage] = useState<{ id: number; tone: 'ok' | 'error'; text: string } | null>(null);
  const [listMessage, setListMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!albumSlug) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/admin/photos?album=${encodeURIComponent(albumSlug)}`);
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      const rows: PhotoRow[] = Array.isArray(data) ? data : [];
      setPhotos(rows);
      setOrder(rows.map(row => row.id));
      setDrafts(Object.fromEntries(rows.map(row => [row.id, toDraft(row)])));
      setRowMessage(null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [albumSlug]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const byId = useMemo(() => new Map(photos.map(photo => [photo.id, photo])), [photos]);
  const serverOrder = useMemo(() => photos.map(photo => photo.id), [photos]);
  const orderDirty = order.length === serverOrder.length && order.some((id, i) => id !== serverOrder[i]);

  function updateDraft(id: number, patch: Partial<Draft>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setRowMessage(prev => (prev?.id === id ? null : prev));
  }

  function reset(photo: PhotoRow) {
    setDrafts(prev => ({ ...prev, [photo.id]: toDraft(photo) }));
    setRowMessage(prev => (prev?.id === photo.id ? null : prev));
  }

  async function save(photo: PhotoRow) {
    const draft = drafts[photo.id];
    if (!draft) return;

    if (draft.title.trim().length === 0) {
      setRowMessage({ id: photo.id, tone: 'error', text: '제목이 비어 있습니다.' });
      return;
    }
    if (!/^\d{4}$/.test(draft.year.trim())) {
      setRowMessage({ id: photo.id, tone: 'error', text: '연도는 네 자리로 적어 주세요.' });
      return;
    }

    // 바뀐 필드만 보낸다 — 손대지 않은 값을 덮어쓰지 않기 위해서다.
    const patch: Record<string, string | number> = {};
    if (draft.title !== photo.title) patch.title = draft.title.trim();
    if (draft.location !== (photo.location ?? '')) patch.location = draft.location.trim();
    if (draft.year !== String(photo.year)) patch.year = Number(draft.year);

    setSavingId(photo.id);
    setRowMessage(null);
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, ...patch }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '저장에 실패했습니다.');

      const updated = body as PhotoRow;
      setPhotos(prev => prev.map(row => (row.id === photo.id ? updated : row)));
      setDrafts(prev => ({ ...prev, [photo.id]: toDraft(updated) }));
      setRowMessage({ id: photo.id, tone: 'ok', text: '저장했습니다.' });
    } catch (error) {
      setRowMessage({
        id: photo.id,
        tone: 'error',
        text: error instanceof Error ? error.message : '저장에 실패했습니다.',
      });
    } finally {
      setSavingId(null);
    }
  }

  // ── 순서 ────────────────────────────────────────────────────────────────────
  // 드래그가 아니라 위/아래 버튼인 이유: HTML5 드래그는 터치에서 동작하지 않고,
  // 이 화면은 폰에서도 쓴다.

  function move(id: number, direction: -1 | 1) {
    setOrder(prev => {
      const from = prev.indexOf(id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setListMessage(null);
  }

  async function saveOrder() {
    setOrderSaving(true);
    setListMessage(null);
    try {
      const res = await fetch('/api/admin/photos/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album_slug: albumSlug, ids: order }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '순서를 저장하지 못했습니다.');
      // 서버가 매긴 sort_order를 그대로 받아 오려면 다시 읽는 편이 확실하다.
      await load();
      setListMessage({ tone: 'ok', text: '순서를 저장했습니다.' });
    } catch (error) {
      setListMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : '순서를 저장하지 못했습니다.',
      });
    } finally {
      setOrderSaving(false);
    }
  }

  async function remove(photo: PhotoRow) {
    const label = photo.title || '이 사진';
    if (!confirm(`${label}을(를) 아카이브에서 내립니다.\n\n원본 파일은 Cloudinary에 그대로 남습니다.`)) return;

    setDeletingId(photo.id);
    setListMessage(null);
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '삭제하지 못했습니다.');

      setPhotos(prev => prev.filter(row => row.id !== photo.id));
      setOrder(prev => prev.filter(id => id !== photo.id));
      setDrafts(prev => {
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });
      setListMessage({ tone: 'ok', text: `${label}을(를) 내렸습니다.` });
    } catch (error) {
      setListMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : '삭제하지 못했습니다.',
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (!albumSlug) return null;

  const busy = orderSaving || deletingId !== null;

  return (
    <div className="border-t border-hairline pt-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="label-ko text-muted-foreground">
          이 앨범의 사진 {photos.length > 0 && `(${photos.length})`}
        </p>
        <div className="flex items-center gap-3">
          {orderDirty && (
            <>
              <button
                type="button"
                onClick={() => { setOrder(serverOrder); setListMessage(null); }}
                disabled={orderSaving}
                className="text-[11px] uppercase tracking-widest text-slate hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1 disabled:opacity-50"
              >
                순서 되돌리기
              </button>
              <button
                type="button"
                onClick={saveOrder}
                disabled={orderSaving}
                className="btn-primary text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
              >
                {orderSaving ? '저장 중...' : '순서 저장'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading || busy}
            className="text-[11px] uppercase tracking-widest text-slate hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1 disabled:opacity-50"
          >
            {loading ? '...' : 'Reload'}
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className={listMessage ? `text-[11px] ${listMessage.tone === 'ok' ? 'text-forest' : 'text-brick'}` : 'sr-only'}>
        {listMessage?.text ?? ''}
      </p>

      {loadError ? (
        <p role="alert" className="text-[11px] text-brick">사진을 불러오지 못했습니다.</p>
      ) : loading && photos.length === 0 ? (
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground animate-pulse">Loading...</p>
      ) : photos.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">이 앨범에는 아직 사진이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {order.map((id, index) => {
            const photo = byId.get(id);
            if (!photo) return null;
            const draft = drafts[id] ?? toDraft(photo);
            const dirty = isDirty(photo, draft);
            const message = rowMessage?.id === id ? rowMessage : null;
            const rowBusy = savingId === id || deletingId === id;

            return (
              <li key={id} className="flex gap-3 items-start rounded-sm border border-border-light p-3">
                {/* 순서 조작 */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={index === 0 || busy}
                    aria-label={`${photo.title} 위로 이동`}
                    className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-light text-slate hover:text-ink hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-30"
                  >
                    &uarr;
                  </button>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={index === order.length - 1 || busy}
                    aria-label={`${photo.title} 아래로 이동`}
                    className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-light text-slate hover:text-ink hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-30"
                  >
                    &darr;
                  </button>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cloudinary(photo.src, { width: 160 })}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-sm object-cover bg-surface"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-end gap-3 flex-wrap">
                    {message && (
                      <span className={`mr-auto text-[11px] ${message.tone === 'ok' ? 'text-forest' : 'text-brick'}`}>
                        {message.text}
                      </span>
                    )}
                    {dirty && (
                      <button
                        type="button"
                        onClick={() => reset(photo)}
                        disabled={rowBusy}
                        className="text-[11px] uppercase tracking-widest text-slate hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1 disabled:opacity-50"
                      >
                        되돌리기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => save(photo)}
                      disabled={!dirty || rowBusy}
                      className="btn-outline text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
                    >
                      {savingId === id ? '...' : '저장'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(photo)}
                      disabled={rowBusy || orderSaving}
                      className="text-[11px] uppercase tracking-widest text-slate hover:text-brick transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1 disabled:opacity-50"
                    >
                      {deletingId === id ? '...' : '삭제'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_0.8fr] gap-2">
                    <input
                      className={INPUT_CLASS}
                      aria-label={`${photo.title} 제목`}
                      placeholder="제목"
                      value={draft.title}
                      onChange={e => updateDraft(id, { title: e.target.value })}
                    />
                    <input
                      className={INPUT_CLASS}
                      aria-label={`${photo.title} 장소`}
                      placeholder="장소"
                      value={draft.location}
                      onChange={e => updateDraft(id, { location: e.target.value })}
                    />
                    <input
                      className={INPUT_CLASS}
                      aria-label={`${photo.title} 연도`}
                      inputMode="numeric"
                      placeholder="연도"
                      value={draft.year}
                      onChange={e => updateDraft(id, { year: e.target.value })}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {photos.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          삭제는 사이트에서 내리는 것까지입니다. Cloudinary의 원본 파일은 그대로 남습니다.
        </p>
      )}
    </div>
  );
}
