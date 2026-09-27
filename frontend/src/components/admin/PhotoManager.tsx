"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import {
  hasLocationInOriginal,
  isLowResolution,
  isMissingExif,
  isPlaceholderText,
  isYearMismatch,
  takenYear,
} from '@/lib/admin/data-checks';
import { dropOnto, moveById, rangeBetween } from '@/lib/admin/reorder';
import { MAX_BULK } from '@/lib/admin/limits';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import type { AlbumOption } from './ArchiveTab';
import {
  BTN_SM,
  CHECKBOX_CLASS,
  CHIP_KO,
  FILTER_CHIP_CLASS,
  ICON_BTN_CLASS,
  INPUT_COMPACT,
  MESSAGE_CLASS,
  PANEL_CLASS,
} from './adminStyles';

/**
 * 이미 올라간 사진의 관리 — 정보 수정, 순서, 숨김, 그리고 여러 장을 한 번에.
 *
 * 정보 수정은 행 단위로 저장한다(바뀐 필드만 전송). 순서는 화면에서 여러 번
 * 옮긴 뒤 한 번에 저장한다 — 한 칸 옮길 때마다 요청을 보내면 되돌리기가
 * 어려워지고, 서버는 어차피 전체 순서를 받아야 한다(`api/admin/photos/order`).
 *
 * 일괄 작업은 체크박스로 고른다. shift-클릭은 마지막으로 누른 칸부터 범위를
 * 고른다 — 112장짜리 앨범에서 "앞의 40장을 다른 앨범으로"가 두 번의 클릭이다.
 */

export type PhotoFilter = 'all' | 'untitled' | 'nolocation' | 'hidden' | 'yearmismatch' | 'lowres' | 'noexif' | 'gps';

/**
 * 개요의 데이터 점검에서 넘어오는 필터. 해당하는 사진이 없는 앨범에서는 칩을
 * 숨긴다 — 늘 보이면 필터 줄이 여덟 칸이 되고, 대부분 0이다.
 */
const CHECK_FILTERS: ReadonlySet<PhotoFilter> = new Set(['yearmismatch', 'lowres', 'noexif', 'gps']);

interface PhotoRow {
  id: number;
  album_slug: string;
  src: string;
  title: string | null;
  location: string | null;
  year: number | null;
  sort_order: number;
  hidden?: boolean;
  // 마이그레이션 뒤에만 오는 컬럼. 없으면 점검 필터가 아무것도 고르지 않는다.
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  exif_checked_at?: string | null;
  gps_in_original?: boolean | null;
}

interface Draft {
  title: string;
  location: string;
  year: string;
}

interface Props {
  albumSlug: string;
  albums: AlbumOption[];
  filter: PhotoFilter;
  onFilterChange: (filter: PhotoFilter) => void;
  /** 값이 바뀌면 목록을 다시 불러온다 — 업로드 저장 직후 새 사진을 보여주기 위함. */
  refreshToken: number;
  /** 이동·삭제처럼 앨범별 장수가 바뀌는 작업 뒤에 부른다. */
  onChanged: () => void;
}

const FILTER_LABEL: Record<PhotoFilter, string> = {
  all: '전체',
  untitled: '제목 없음',
  nolocation: '장소 없음',
  hidden: '숨김',
  yearmismatch: '연도 불일치',
  lowres: '저해상도',
  noexif: '촬영 정보 없음',
  gps: '위치가 남은 원본',
};

function toDraft(photo: PhotoRow): Draft {
  return { title: photo.title ?? '', location: photo.location ?? '', year: photo.year == null ? '' : String(photo.year) };
}

function isDirty(photo: PhotoRow, draft: Draft): boolean {
  const base = toDraft(photo);
  return draft.title !== base.title || draft.location !== base.location || draft.year !== base.year;
}

function matches(photo: PhotoRow, filter: PhotoFilter): boolean {
  if (filter === 'untitled') return isPlaceholderText(photo.title);
  if (filter === 'nolocation') return isPlaceholderText(photo.location);
  if (filter === 'hidden') return photo.hidden === true;
  if (filter === 'yearmismatch') return isYearMismatch(photo);
  if (filter === 'lowres') return isLowResolution(photo);
  if (filter === 'noexif') return isMissingExif(photo);
  if (filter === 'gps') return hasLocationInOriginal(photo);
  return true;
}

/** 점검 필터로 볼 때 행에 붙이는 근거 한 줄. 무엇이 어긋났는지 보여야 고칠 수 있다. */
function checkNote(photo: PhotoRow, filter: PhotoFilter): string | null {
  if (filter === 'yearmismatch' && isYearMismatch(photo)) return `촬영일 ${takenYear(photo.taken_at)}년`;
  if (filter === 'lowres' && isLowResolution(photo)) return `${photo.width}×${photo.height}px`;
  if (filter === 'gps' && hasLocationInOriginal(photo)) return '원본에 위치 정보가 남아 있습니다';
  return null;
}

export default function PhotoManager({ albumSlug, albums, filter, onFilterChange, refreshToken, onChanged }: Props) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  /** 화면에 보이는 순서. 저장 전까지는 서버 순서와 다를 수 있다. */
  const [order, setOrder] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  /** 마지막으로 읽은 앨범. 다른 앨범을 읽었을 때만 선택을 비운다. 렌더에 쓰지 않으므로 ref. */
  const loadedSlug = useRef('');
  const [migrationPending, setMigrationPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  /** 진행 중인 작업. 한 번에 하나만 — 순서 저장 중에 일괄 이동이 끼면 서로의 전제가 깨진다. */
  const [busy, setBusy] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<Message | null>(null);
  const [rowMessage, setRowMessage] = useState<(Message & { id: number }) | null>(null);

  const [moveTarget, setMoveTarget] = useState('');
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkYear, setBulkYear] = useState('');

  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    if (!albumSlug) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await adminFetch<{ photos: PhotoRow[]; migrationPending: boolean }>(
        `/api/admin/photos?album=${encodeURIComponent(albumSlug)}`,
      );
      const rows = data.photos;
      setPhotos(rows);
      setOrder(rows.map(row => row.id));
      setMigrationPending(data.migrationPending);
      // Unsaved edits survive a reload — 순서 저장·업로드 저장도 이 목록을 다시
      // 읽는데, 그때 반쯤 적어 둔 캡션이 조용히 사라지면 안 된다. 서버 값과 같아진
      // 초안은 더 이상 편집이 아니므로 버린다.
      setDrafts(prev =>
        Object.fromEntries(
          rows.map(row => {
            const pending = prev[row.id];
            return [row.id, pending && isDirty(row, pending) ? pending : toDraft(row)];
          }),
        ),
      );
      // 다른 앨범으로 바뀌었으면 선택을 비운다. 같은 앨범이면 남아 있는 것만 유지.
      const ids = new Set(rows.map(row => row.id));
      const sameAlbum = loadedSlug.current === albumSlug;
      setSelected(prev => (sameAlbum ? new Set([...prev].filter(id => ids.has(id))) : new Set()));
      loadedSlug.current = albumSlug;
      setRowMessage(null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [albumSlug]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const byId = useMemo(() => new Map(photos.map(photo => [photo.id, photo])), [photos]);
  const serverOrder = useMemo(() => photos.map(photo => photo.id), [photos]);
  const orderDirty = order.length === serverOrder.length && order.some((id, i) => id !== serverOrder[i]);
  const visible = order.filter(id => {
    const photo = byId.get(id);
    return photo ? matches(photo, filter) : false;
  });
  const counts = Object.fromEntries(
    (Object.keys(FILTER_LABEL) as PhotoFilter[]).map(key => [key, photos.filter(p => matches(p, key)).length]),
  ) as Record<PhotoFilter, number>;
  const selectedInOrder = order.filter(id => selected.has(id));
  const allVisibleSelected = visible.length > 0 && visible.every(id => selected.has(id));
  // 필터로 일부만 보일 때 끌어 옮기면 "보이지 않는 사진 사이의 어디"인지가
  // 모호해진다. 순서 변경은 전체 보기에서만 한다.
  const canReorder = filter === 'all' && busy === null;

  // ── 선택 ────────────────────────────────────────────────────────────────────

  function toggle(id: number, shiftKey: boolean) {
    const willSelect = !selected.has(id);
    const range = shiftKey ? rangeBetween(visible, anchor, id) : [id];
    setSelected(prev => {
      const next = new Set(prev);
      for (const item of range) {
        if (willSelect) next.add(item);
        else next.delete(item);
      }
      return next;
    });
    setAnchor(id);
  }

  function toggleAllVisible() {
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of visible) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  // ── 행 편집 ─────────────────────────────────────────────────────────────────

  function updateDraft(id: number, patch: Partial<Draft>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setRowMessage(prev => (prev?.id === id ? null : prev));
  }

  async function saveRow(photo: PhotoRow) {
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
    const base = toDraft(photo);
    const patch: Record<string, string | number> = {};
    if (draft.title !== base.title) patch.title = draft.title.trim();
    if (draft.location !== base.location) patch.location = draft.location.trim();
    if (draft.year !== base.year) patch.year = Number(draft.year);

    setBusy(`row:${photo.id}`);
    try {
      const updated = await adminFetch<PhotoRow>('/api/admin/photos', 'PATCH', { id: photo.id, ...patch });
      setPhotos(prev => prev.map(row => (row.id === photo.id ? { ...row, ...updated } : row)));
      setDrafts(prev => ({ ...prev, [photo.id]: toDraft({ ...photo, ...updated }) }));
      setRowMessage({ id: photo.id, tone: 'ok', text: '저장했습니다.' });
    } catch (error) {
      setRowMessage({ id: photo.id, tone: 'error', text: errorMessage(error, '저장에 실패했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  async function toggleHidden(photo: PhotoRow) {
    setBusy(`row:${photo.id}`);
    try {
      const updated = await adminFetch<PhotoRow>('/api/admin/photos', 'PATCH', { id: photo.id, hidden: !photo.hidden });
      setPhotos(prev => prev.map(row => (row.id === photo.id ? { ...row, hidden: updated.hidden } : row)));
      setRowMessage({ id: photo.id, tone: 'ok', text: updated.hidden ? '공개 화면에서 숨겼습니다.' : '다시 보이게 했습니다.' });
    } catch (error) {
      setRowMessage({ id: photo.id, tone: 'error', text: errorMessage(error, '바꾸지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  // ── 순서 ────────────────────────────────────────────────────────────────────
  // 드래그 앤 드롭과 위/아래 버튼을 둘 다 둔다. HTML5 드래그는 터치와 키보드에서
  // 동작하지 않고, 이 화면은 폰에서도 쓴다.

  function move(id: number, direction: -1 | 1) {
    setOrder(prev => moveById(prev, id, direction));
    setListMessage(null);
  }

  function drop(targetId: number) {
    if (dragId !== null && dragId !== targetId) {
      setOrder(prev => dropOnto(prev, dragId, targetId));
      setListMessage(null);
    }
    setDragId(null);
    setOverId(null);
  }

  async function saveOrder() {
    setBusy('order');
    setListMessage(null);
    try {
      await adminFetch('/api/admin/photos/order', 'POST', { album_slug: albumSlug, ids: order });
      // 서버가 매긴 sort_order를 그대로 받아 오려면 다시 읽는 편이 확실하다.
      await load();
      setListMessage({ tone: 'ok', text: '순서를 저장했습니다.' });
    } catch (error) {
      setListMessage({ tone: 'error', text: errorMessage(error, '순서를 저장하지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  // ── 일괄 작업 ───────────────────────────────────────────────────────────────

  async function runBulk(body: Record<string, unknown>, success: (updated: number) => string, changesAlbums = false) {
    if (orderDirty) {
      setListMessage({ tone: 'error', text: '저장하지 않은 순서 변경이 있습니다. 먼저 저장하거나 되돌려 주세요.' });
      return;
    }
    setBusy('bulk');
    setListMessage(null);
    try {
      const result = await adminFetch<{ updated: number; coversLost?: string[] }>('/api/admin/photos/bulk', 'POST', {
        ...body,
        ids: selectedInOrder,
      });
      const covers = result.coversLost?.length ? ` 커버를 잃은 앨범: ${result.coversLost.join(', ')}` : '';
      setListMessage({ tone: 'ok', text: success(result.updated) + covers });
      setSelected(new Set());
      await load();
      if (changesAlbums) onChanged();
    } catch (error) {
      setListMessage({ tone: 'error', text: errorMessage(error, '일괄 작업에 실패했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  async function bulkMove() {
    const target = albums.find(album => album.slug === moveTarget);
    if (!target) return;
    await runBulk({ action: 'move', album_slug: target.slug }, n => `${n}장을 ${target.title}의 끝으로 옮겼습니다.`, true);
    setMoveTarget('');
  }

  async function bulkLocationApply() {
    await runBulk({ action: 'location', location: bulkLocation }, n => `${n}장의 장소를 “${bulkLocation.trim() || '(비움)'}”로 바꿨습니다.`);
    setBulkLocation('');
  }

  async function bulkYearApply() {
    if (!/^\d{4}$/.test(bulkYear.trim())) {
      setListMessage({ tone: 'error', text: '연도는 네 자리로 적어 주세요.' });
      return;
    }
    await runBulk({ action: 'year', year: Number(bulkYear) }, n => `${n}장의 연도를 ${bulkYear}로 바꿨습니다.`);
    setBulkYear('');
  }

  async function bulkDelete() {
    const ok = await confirm({
      title: `사진 ${selectedInOrder.length}장을 내릴까요?`,
      body: (
        <>
          <p>아카이브에서 행이 지워집니다. 되돌리려면 다시 올려야 합니다.</p>
          <p className="text-slate">
            원본 파일은 Cloudinary에 남습니다 — 공개 화면에서만 빼려면 &ldquo;숨기기&rdquo;가 맞습니다.
          </p>
        </>
      ),
      confirmLabel: `${selectedInOrder.length}장 내리기`,
    });
    if (!ok) return;
    await runBulk({ action: 'delete' }, n => `${n}장을 내렸습니다.`, true);
  }

  async function removeOne(photo: PhotoRow) {
    const ok = await confirm({
      title: '이 사진을 내릴까요?',
      body: <p>{photo.title || '제목 없는 사진'} — 원본 파일은 Cloudinary에 그대로 남습니다.</p>,
      confirmLabel: '내리기',
    });
    if (!ok) return;
    setBusy(`row:${photo.id}`);
    try {
      await adminFetch('/api/admin/photos', 'DELETE', { id: photo.id });
      setPhotos(prev => prev.filter(row => row.id !== photo.id));
      setOrder(prev => prev.filter(id => id !== photo.id));
      setSelected(prev => new Set([...prev].filter(id => id !== photo.id)));
      setListMessage({ tone: 'ok', text: `${photo.title || '사진'}을(를) 내렸습니다.` });
      onChanged();
    } catch (error) {
      setListMessage({ tone: 'error', text: errorMessage(error, '삭제하지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  if (!albumSlug) return null;

  const otherAlbums = albums.filter(album => album.slug !== albumSlug);
  const tooMany = selectedInOrder.length > MAX_BULK;

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`} aria-labelledby="photo-manager-title">
      {dialog}
      <SectionHeader
        eyebrow="이 앨범의 사진"
        title={`${albums.find(a => a.slug === albumSlug)?.title ?? albumSlug} · ${photos.length}장`}
        actions={
          <>
            {orderDirty && (
              <>
                <button type="button" onClick={() => { setOrder(serverOrder); setListMessage(null); }} disabled={busy !== null} className={`btn-ghost ${BTN_SM} text-slate`}>
                  순서 되돌리기
                </button>
                <button type="button" onClick={saveOrder} disabled={busy !== null} className={`btn-primary ${BTN_SM}`}>
                  {busy === 'order' ? '저장 중…' : '순서 저장'}
                </button>
              </>
            )}
            <div role="group" aria-label="보기 방식" className="inline-flex rounded-full border border-border bg-card p-0.5">
              {(['list', 'grid'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    view === mode ? 'bg-primary text-primary-foreground' : 'text-slate hover:text-ink'
                  }`}
                >
                  {mode === 'list' ? '목록' : '격자'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void load()} disabled={loading || busy !== null} className={`btn-ghost ${BTN_SM} text-slate`}>
              {loading ? '…' : '새로 고침'}
            </button>
          </>
        }
      />
      <h3 id="photo-manager-title" className="sr-only">사진 목록</h3>

      {migrationPending && <MigrationNotice feature="사진 숨기기" />}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="사진 필터">
        {(Object.keys(FILTER_LABEL) as PhotoFilter[])
          .filter(key => !CHECK_FILTERS.has(key) || counts[key] > 0 || filter === key)
          .map(key => (
          <button
            key={key}
            type="button"
            data-active={filter === key}
            aria-pressed={filter === key}
            onClick={() => onFilterChange(key)}
            className={FILTER_CHIP_CLASS}
          >
            {FILTER_LABEL[key]} <span className="tabular-nums opacity-80">{counts[key]}</span>
          </button>
        ))}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate">
          <input type="checkbox" className={CHECKBOX_CLASS} checked={allVisibleSelected} onChange={toggleAllVisible} disabled={visible.length === 0} />
          보이는 {visible.length}장 모두 선택
        </label>
      </div>

      <StatusLine message={listMessage} />

      {loadError ? (
        <p role="alert" className={MESSAGE_CLASS.error}>사진을 불러오지 못했습니다.</p>
      ) : loading && photos.length === 0 ? (
        <LoadingLine />
      ) : photos.length === 0 ? (
        <EmptyLine>이 앨범에는 아직 사진이 없습니다.</EmptyLine>
      ) : visible.length === 0 ? (
        <EmptyLine>&ldquo;{FILTER_LABEL[filter]}&rdquo;에 해당하는 사진이 없습니다.</EmptyLine>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {visible.map(id => {
            const photo = byId.get(id)!;
            const isSelected = selected.has(id);
            return (
              <li
                key={id}
                draggable={canReorder}
                onDragStart={() => setDragId(id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={e => { if (dragId !== null) { e.preventDefault(); setOverId(id); } }}
                onDrop={e => { e.preventDefault(); drop(id); }}
                className={`relative rounded-md transition-shadow ${overId === id && dragId !== id ? 'ring-2 ring-fern' : ''} ${dragId === id ? 'opacity-40' : ''}`}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${photo.title || '제목 없음'} 선택`}
                  onClick={e => toggle(id, e.shiftKey)}
                  className={`group block w-full overflow-hidden rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                    isSelected ? 'ring-2 ring-forest' : ''
                  }`}
                >
                  <span className="relative block aspect-square bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cloudinary(photo.src, { width: 240 })} alt="" loading="lazy" draggable={false} className={`h-full w-full object-cover ${photo.hidden ? 'opacity-40' : ''}`} />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-card/90 px-1.5 font-mono text-[10px] tabular-nums text-slate">
                      {order.indexOf(id) + 1}
                    </span>
                    <span
                      aria-hidden
                      className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                        isSelected ? 'border-forest bg-forest text-primary-foreground' : 'border-border bg-card/90 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    {photo.hidden && <span className={`badge-solid absolute bottom-1.5 left-1.5 ${CHIP_KO}`}>숨김</span>}
                  </span>
                  <span className="block truncate px-0.5 pt-1 text-[12px] text-ink-body">{photo.title || '제목 없음'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-3">
          {visible.map(id => {
            const photo = byId.get(id)!;
            const index = order.indexOf(id);
            const draft = drafts[id] ?? toDraft(photo);
            const dirty = isDirty(photo, draft);
            const message = rowMessage?.id === id ? rowMessage : null;
            const rowBusy = busy === `row:${id}`;
            const label = photo.title || '제목 없는 사진';

            return (
              <li
                key={id}
                onDragOver={e => { if (dragId !== null) { e.preventDefault(); setOverId(id); } }}
                onDrop={e => { e.preventDefault(); drop(id); }}
                className={`flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors ${
                  selected.has(id) ? 'border-forest/50 bg-moss-wash/40' : 'border-border'
                } ${overId === id && dragId !== id ? 'ring-2 ring-fern' : ''} ${dragId === id ? 'opacity-40' : ''}`}
              >
                <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={selected.has(id)}
                    // onChange는 shift 여부를 모른다. 클릭 이벤트에서 판단하고,
                    // 체크 상태는 `selected`가 결정한다.
                    onChange={() => undefined}
                    onClick={e => toggle(id, e.shiftKey)}
                    aria-label={`${label} 선택`}
                  />
                  <span
                    draggable={canReorder}
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(id); }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    aria-hidden
                    title={canReorder ? '끌어서 순서 바꾸기' : '순서는 “전체” 보기에서 바꿉니다'}
                    className={`select-none px-1 text-lg leading-none text-muted-foreground ${canReorder ? 'cursor-grab active:cursor-grabbing' : 'opacity-30'}`}
                  >
                    ⠿
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-1">
                  <button type="button" onClick={() => move(id, -1)} disabled={index === 0 || !canReorder} aria-label={`${label} 위로 이동`} className={ICON_BTN_CLASS}>
                    ↑
                  </button>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>
                  <button type="button" onClick={() => move(id, 1)} disabled={index === order.length - 1 || !canReorder} aria-label={`${label} 아래로 이동`} className={ICON_BTN_CLASS}>
                    ↓
                  </button>
                </div>

                <span className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinary(photo.src, { width: 200 })}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className={`h-20 w-20 rounded-md bg-surface object-cover ${photo.hidden ? 'opacity-40' : ''}`}
                  />
                  {photo.hidden && <span className={`badge-solid absolute bottom-1 left-1 px-2 ${CHIP_KO}`}>숨김</span>}
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1.5fr_0.8fr]">
                    <input
                      className={INPUT_COMPACT}
                      aria-label={`${label} 제목`}
                      aria-invalid={isPlaceholderText(draft.title)}
                      placeholder="제목"
                      value={draft.title}
                      onChange={e => updateDraft(id, { title: e.target.value })}
                    />
                    <input
                      className={INPUT_COMPACT}
                      aria-label={`${label} 장소`}
                      placeholder="장소"
                      value={draft.location}
                      onChange={e => updateDraft(id, { location: e.target.value })}
                    />
                    <input
                      className={INPUT_COMPACT}
                      aria-label={`${label} 연도`}
                      inputMode="numeric"
                      placeholder="연도"
                      value={draft.year}
                      onChange={e => updateDraft(id, { year: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {message ? (
                      <span className={`mr-auto ${MESSAGE_CLASS[message.tone]}`}>{message.text}</span>
                    ) : (
                      checkNote(photo, filter) && (
                        <span className="mr-auto text-[12px] tabular-nums text-brick">{checkNote(photo, filter)}</span>
                      )
                    )}
                    {dirty && (
                      <button type="button" onClick={() => updateDraft(id, toDraft(photo))} disabled={rowBusy} className={`btn-ghost ${BTN_SM} text-slate`}>
                        되돌리기
                      </button>
                    )}
                    <button type="button" onClick={() => void saveRow(photo)} disabled={!dirty || busy !== null} className={`btn-outline ${BTN_SM}`}>
                      {rowBusy && dirty ? '…' : '저장'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleHidden(photo)}
                      disabled={busy !== null || migrationPending}
                      aria-pressed={photo.hidden === true}
                      className={`btn-ghost ${BTN_SM} text-slate`}
                    >
                      {photo.hidden ? '보이기' : '숨기기'}
                    </button>
                    <button type="button" onClick={() => void removeOne(photo)} disabled={busy !== null} className={`btn-ghost ${BTN_SM} text-slate hover:text-brick`}>
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── 일괄 작업 바 ── 선택이 있을 때만. 목록이 길어도 손 닿는 곳에 있도록
          화면 아래에 붙는다. */}
      {selectedInOrder.length > 0 && (
        <div className="sticky bottom-4 z-20 rounded-lg border border-forest/30 bg-card/95 p-3 shadow-lg backdrop-blur md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-ko mr-2 text-forest">
              {selectedInOrder.length}장 선택
              {tooMany && <span className="text-brick"> — 한 번에 {MAX_BULK}장까지</span>}
            </p>
            <button type="button" onClick={() => void runBulk({ action: 'hidden', hidden: true }, n => `${n}장을 숨겼습니다.`)} disabled={busy !== null || tooMany || migrationPending} className={`btn-outline ${BTN_SM}`}>
              숨기기
            </button>
            <button type="button" onClick={() => void runBulk({ action: 'hidden', hidden: false }, n => `${n}장을 다시 보이게 했습니다.`)} disabled={busy !== null || tooMany || migrationPending} className={`btn-outline ${BTN_SM}`}>
              보이기
            </button>
            <button type="button" onClick={() => void bulkDelete()} disabled={busy !== null || tooMany} className={`btn-destructive ${BTN_SM}`}>
              삭제
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className={`btn-ghost ${BTN_SM} ml-auto text-slate`}>
              선택 해제
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 md:grid-cols-3">
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void bulkMove(); }}>
              <select aria-label="옮길 앨범" className={INPUT_COMPACT} value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>
                <option value="">다른 앨범으로 이동…</option>
                {otherAlbums.map(album => (
                  <option key={album.slug} value={album.slug}>{album.title}</option>
                ))}
              </select>
              <button type="submit" disabled={!moveTarget || busy !== null || tooMany} className={`btn-outline ${BTN_SM}`}>이동</button>
            </form>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void bulkLocationApply(); }}>
              <input aria-label="장소 일괄 입력" placeholder="장소 일괄 입력" className={INPUT_COMPACT} value={bulkLocation} onChange={e => setBulkLocation(e.target.value)} />
              <button type="submit" disabled={busy !== null || tooMany} className={`btn-outline ${BTN_SM}`}>적용</button>
            </form>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void bulkYearApply(); }}>
              <input aria-label="연도 일괄 입력" placeholder="연도 일괄 입력" inputMode="numeric" className={INPUT_COMPACT} value={bulkYear} onChange={e => setBulkYear(e.target.value)} />
              <button type="submit" disabled={!bulkYear || busy !== null || tooMany} className={`btn-outline ${BTN_SM}`}>적용</button>
            </form>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-[12px] text-muted-foreground">
          순서는 끌어 놓거나 ↑↓로 바꾼 뒤 &ldquo;순서 저장&rdquo;을 누릅니다. 삭제해도 Cloudinary 원본은 남고, 설정 탭에서 정리합니다.
        </p>
      )}
    </section>
  );
}
