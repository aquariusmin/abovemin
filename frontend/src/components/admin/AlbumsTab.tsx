"use client";

import { useEffect, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { dropOnto, moveById } from '@/lib/admin/reorder';
import { isValidSlug, suggestSlug } from '@/lib/admin/slug';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import PhotoPicker from './PhotoPicker';
import {
  BTN_SM,
  CHIP_KO,
  ICON_BTN_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
} from './adminStyles';

/**
 * 앨범 관리 — 만들기, 이름·슬러그·설명, 커버, 공개 여부, 순서, 지우기.
 *
 * 순서는 사진과 같은 방식이다: 끌어 놓거나 ↑↓로 바꾼 뒤 한 번에 저장하고,
 * 서버가 1..n으로 다시 매긴다(`api/admin/albums/order`).
 */

interface AlbumRow {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  sort_order: number;
  published: boolean;
  description: string | null;
  photo_count: number;
  hidden_count: number;
}

export default function AlbumsTab({ active }: { active: boolean }) {
  const { params } = useAdminNav();
  const focusSlug = params.get('album');

  const [albums, setAlbums] = useState<AlbumRow[] | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [openId, setOpenId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ albums: AlbumRow[]; migrationPending: boolean }>('/api/admin/albums');
        if (cancelled) return;
        setAlbums(data.albums);
        setOrder(data.albums.map(album => album.id));
        setMigrationPending(data.migrationPending);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, '앨범을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, reloadKey]);

  // 개요의 "고치기"로 들어오면 그 앨범의 편집을 연다. 목록이 도착한 뒤에야
  // id를 알 수 있으므로 렌더 중에 한 번 맞춘다.
  const [focused, setFocused] = useState<string | null>(null);
  if (albums && focusSlug && focused !== focusSlug) {
    setFocused(focusSlug);
    const target = albums.find(album => album.slug === focusSlug);
    if (target) setOpenId(target.id);
  }

  const reload = () => setReloadKey(k => k + 1);

  if (loadError && !albums) return <p role="alert" className="py-8 text-center text-sm text-brick">{loadError}</p>;
  if (!albums) return <LoadingLine />;

  const byId = new Map(albums.map(album => [album.id, album]));
  const serverOrder = albums.map(album => album.id);
  const orderDirty = order.length === serverOrder.length && order.some((id, i) => id !== serverOrder[i]);

  async function saveOrder() {
    setBusy(true);
    setMessage(null);
    try {
      await adminFetch('/api/admin/albums/order', 'POST', { ids: order });
      setMessage({ tone: 'ok', text: '앨범 순서를 저장했습니다.' });
      reload();
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, '순서를 저장하지 못했습니다.') });
    } finally {
      setBusy(false);
    }
  }

  async function patch(album: AlbumRow, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      await adminFetch('/api/admin/albums', 'PATCH', { id: album.id, ...body });
      setMessage({ tone: 'ok', text: success });
      reload();
      return true;
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, '저장하지 못했습니다.') });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(album: AlbumRow) {
    const ok = await confirm({
      title: `“${album.title}” 앨범을 지울까요?`,
      body: <p>사진이 없는 앨범입니다. /archive/{album.slug} 주소는 더 이상 열리지 않습니다.</p>,
      confirmLabel: '앨범 지우기',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await adminFetch('/api/admin/albums', 'DELETE', { id: album.id });
      setMessage({ tone: 'ok', text: `“${album.title}” 앨범을 지웠습니다.` });
      setOpenId(null);
      reload();
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, '지우지 못했습니다.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {dialog}
      <SectionHeader
        eyebrow="앨범"
        title={`앨범 ${albums.length}개`}
        description="순서는 /archive에 보이는 순서입니다. 비공개 앨범은 목록과 검색에서 빠지고, 주소로도 열리지 않습니다."
        actions={
          orderDirty && (
            <>
              <button type="button" onClick={() => setOrder(serverOrder)} disabled={busy} className={`btn-ghost ${BTN_SM} text-slate`}>
                순서 되돌리기
              </button>
              <button type="button" onClick={() => void saveOrder()} disabled={busy} className={`btn-primary ${BTN_SM}`}>
                순서 저장
              </button>
            </>
          )
        }
      />

      {migrationPending && <MigrationNotice feature="공개/비공개 전환과 앨범 설명" />}
      <StatusLine message={message} />

      <NewAlbumForm onCreated={title => { setMessage({ tone: 'ok', text: `“${title}” 앨범을 만들었습니다.` }); reload(); }} migrationPending={migrationPending} />

      {albums.length === 0 ? (
        <EmptyLine>앨범이 없습니다.</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {order.map((id, index) => {
            const album = byId.get(id);
            if (!album) return null;
            const open = openId === id;
            return (
              <li
                key={id}
                onDragOver={e => { if (dragId !== null) { e.preventDefault(); setOverId(id); } }}
                onDrop={e => {
                  e.preventDefault();
                  if (dragId !== null && dragId !== id) setOrder(prev => dropOnto(prev, dragId, id));
                  setDragId(null);
                  setOverId(null);
                }}
                className={`rounded-lg border bg-card shadow-xs transition-colors ${open ? 'border-forest/40' : 'border-border'} ${
                  overId === id && dragId !== id ? 'ring-2 ring-fern' : ''
                } ${dragId === id ? 'opacity-40' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-3 p-3 md:flex-nowrap md:p-4">
                  <span
                    draggable={!busy}
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(id); }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    aria-hidden
                    title="끌어서 순서 바꾸기"
                    className="cursor-grab select-none px-1 text-lg leading-none text-muted-foreground active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setOrder(prev => moveById(prev, id, -1))} disabled={index === 0 || busy} aria-label={`${album.title} 위로 이동`} className={ICON_BTN_CLASS}>↑</button>
                    <button type="button" onClick={() => setOrder(prev => moveById(prev, id, 1))} disabled={index === order.length - 1 || busy} aria-label={`${album.title} 아래로 이동`} className={ICON_BTN_CLASS}>↓</button>
                  </div>

                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
                    {album.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cloudinary(album.cover, { width: 160 })} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-serif text-lg font-medium tracking-tight text-ink">{album.title}</span>
                      {!album.published && <span className={`chip ${CHIP_KO} bg-muted text-muted-foreground`}>비공개</span>}
                    </p>
                    <p className="truncate text-[13px] text-slate">
                      <span className="font-mono text-[12px]">/{album.slug}</span> · 사진 {album.photo_count}장
                      {album.hidden_count > 0 && ` (숨김 ${album.hidden_count})`}
                    </p>
                  </div>

                  <div className="flex w-full items-center justify-end gap-2 md:w-auto">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={album.published}
                      aria-label={`${album.title} 공개`}
                      disabled={busy || migrationPending}
                      onClick={() => void patch(album, { published: !album.published }, album.published ? `“${album.title}”을 비공개로 바꿨습니다.` : `“${album.title}”을 공개했습니다.`)}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[13px] text-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${album.published ? 'bg-forest' : 'bg-input'}`}>
                        <span className={`absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-card shadow-xs transition-transform ${album.published ? 'translate-x-[1.125rem]' : 'translate-x-0.5'}`} />
                      </span>
                      {album.published ? '공개' : '비공개'}
                    </button>
                    <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : id)} className={`btn-outline ${BTN_SM}`}>
                      {open ? '닫기' : '편집'}
                    </button>
                  </div>
                </div>

                {open && (
                  <AlbumEditor
                    album={album}
                    busy={busy}
                    migrationPending={migrationPending}
                    onSave={(body, success) => patch(album, body, success)}
                    onDelete={() => void remove(album)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── 새 앨범 ─────────────────────────────────────────────────────────────────

function NewAlbumForm({ onCreated, migrationPending }: { onCreated: (title: string) => void; migrationPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  /** 슬러그를 직접 고친 뒤에는 제목을 바꿔도 덮어쓰지 않는다. */
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugInvalid = slug.length > 0 && !isValidSlug(slug);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError('제목을 적어 주세요.');
    if (!isValidSlug(slug)) return setError('슬러그는 영문 소문자·숫자·하이픈 1~64자여야 합니다.');
    setSaving(true);
    setError(null);
    try {
      await adminFetch('/api/admin/albums', 'POST', {
        title: title.trim(),
        slug,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      onCreated(title.trim());
      setTitle('');
      setSlug('');
      setSlugTouched(false);
      setDescription('');
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e, '앨범을 만들지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`btn-outline ${BTN_SM}`}>
        + 새 앨범
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={`${PANEL_CLASS} space-y-4 p-5 md:p-6`}>
      <p className="label-ko eyebrow-marked text-muted-foreground">새 앨범</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="new-album-title" className={LABEL_CLASS}>제목</label>
          <input
            id="new-album-title"
            className={INPUT_CLASS}
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(suggestSlug(e.target.value));
            }}
            placeholder="Jeju 2026"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="new-album-slug" className={LABEL_CLASS}>슬러그 (주소)</label>
          <input
            id="new-album-slug"
            className={`${INPUT_CLASS} font-mono text-sm`}
            value={slug}
            aria-invalid={slugInvalid}
            aria-describedby="new-album-slug-help"
            onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
            placeholder="jeju-2026"
          />
          <p id="new-album-slug-help" className="mt-1.5 text-[12px] text-muted-foreground">
            /archive/{slug || '…'} — 영문 소문자·숫자·하이픈. 한글 제목은 직접 적어 주세요.
          </p>
        </div>
      </div>
      {!migrationPending && (
        <div>
          <label htmlFor="new-album-description" className={LABEL_CLASS}>설명 (선택)</label>
          <textarea id="new-album-description" rows={2} className={INPUT_CLASS} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={`btn-ghost ${BTN_SM} text-slate`}>취소</button>
        <button type="submit" disabled={saving} className={`btn-primary ${BTN_SM}`}>{saving ? '만드는 중…' : '앨범 만들기'}</button>
      </div>
    </form>
  );
}

// ── 편집 ─────────────────────────────────────────────────────────────────────

function AlbumEditor({
  album,
  busy,
  migrationPending,
  onSave,
  onDelete,
}: {
  album: AlbumRow;
  busy: boolean;
  migrationPending: boolean;
  onSave: (body: Record<string, unknown>, success: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [description, setDescription] = useState(album.description ?? '');
  const [pickingCover, setPickingCover] = useState(false);

  const slugChanged = slug !== album.slug;
  const slugInvalid = !isValidSlug(slug);
  const dirty = title.trim() !== album.title || slugChanged || description.trim() !== (album.description ?? '');

  function save() {
    const body: Record<string, unknown> = {};
    if (title.trim() !== album.title) body.title = title.trim();
    if (slugChanged) body.slug = slug;
    if (description.trim() !== (album.description ?? '')) body.description = description.trim();
    void onSave(body, '앨범 정보를 저장했습니다.');
  }

  return (
    <div className="space-y-5 border-t border-border p-4 md:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`album-${album.id}-title`} className={LABEL_CLASS}>제목</label>
          <input id={`album-${album.id}-title`} className={INPUT_CLASS} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`album-${album.id}-slug`} className={LABEL_CLASS}>슬러그</label>
          <input
            id={`album-${album.id}-slug`}
            className={`${INPUT_CLASS} font-mono text-sm`}
            value={slug}
            aria-invalid={slugInvalid}
            onChange={e => setSlug(e.target.value)}
          />
          {slugChanged && (
            // 슬러그는 공개 주소다. 바꾸면 옛 주소로 공유된 링크가 404가 된다.
            <p className="mt-1.5 text-[12px] text-brick">
              주소가 /archive/{album.slug} → /archive/{slug || '…'}로 바뀝니다. 옛 링크는 더 이상 열리지 않습니다.
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor={`album-${album.id}-description`} className={LABEL_CLASS}>설명</label>
        <textarea
          id={`album-${album.id}-description`}
          rows={2}
          className={INPUT_CLASS}
          value={description}
          disabled={migrationPending}
          placeholder={migrationPending ? '마이그레이션 적용 후 쓸 수 있습니다' : ''}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || album.photo_count > 0}
          title={album.photo_count > 0 ? '사진이 있는 앨범은 지울 수 없습니다' : undefined}
          className={`btn-ghost ${BTN_SM} text-brick`}
        >
          앨범 지우기{album.photo_count > 0 && ` (사진 ${album.photo_count}장 있음)`}
        </button>
        <button type="button" onClick={save} disabled={!dirty || busy || slugInvalid || !title.trim()} className={`btn-primary ${BTN_SM}`}>
          정보 저장
        </button>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-ko text-ink-body">커버 — 이 앨범의 사진 중에서 고릅니다</p>
          {album.photo_count > 0 && (
            <button type="button" onClick={() => setPickingCover(v => !v)} className={`btn-outline ${BTN_SM}`}>
              {pickingCover ? '닫기' : '커버 고르기'}
            </button>
          )}
        </div>
        {album.photo_count === 0 && <p className="text-[13px] text-muted-foreground">사진을 올린 뒤 커버를 고를 수 있습니다.</p>}
        {pickingCover && (
          <PhotoPicker
            albumSlug={album.slug}
            selectedSrc={album.cover}
            onPick={async photo => {
              if (await onSave({ cover_photo_id: photo.id }, '커버를 바꿨습니다.')) setPickingCover(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
