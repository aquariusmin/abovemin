"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch, errorMessage, uploadToCloudinary, type SignResponse } from '@/lib/admin/client';
import { CONVERTED_NOTICE, prepareUpload, type PrivacyStatus } from '@/lib/admin/upload-privacy';
import type { RoundedCoord } from '@/lib/exif-strip';
import { StatusLine, type Message } from './AdminUi';
import { useUnsavedGuard } from './UnsavedGuard';
import { BTN_SM, CHIP_KO, INPUT_COMPACT, LABEL_CLASS, INPUT_CLASS } from './adminStyles';

/** 위치 정보를 브라우저에서 지운 뒤 Cloudinary로 직접 올린다. "저장"을 눌러야 `photos` 행이 생긴다. */

type RowStatus = 'uploading' | 'ready' | 'error';

interface Row {
  key: string;
  fileName: string;
  preview: string;
  status: RowStatus;
  error?: string;
  src?: string;
  privacy?: PrivacyStatus;
  /** 반올림된 좌표(약 11km). 정밀한 좌표는 이 컴포넌트에 들어오지 않는다. */
  coord?: RoundedCoord | null;
  title: string;
  location: string;
  year: string;
}

interface Props {
  albumSlug: string;
  albumTitle: string;
  onPendingChange: (count: number) => void;
  onSaved: () => void;
}

/** 원본은 장당 수 MB라 동시 업로드 수를 제한한다. */
const CONCURRENCY = 3;
const MAX_BATCH = 60;

/** Chrome·Windows는 HEIC에 MIME을 붙이지 않는다 — 타입만 보면 안내 없이 걸러진다. */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(heic|heif|avif|tiff?)$/i.test(file.name);
}

const PRIVACY_BADGE: Record<PrivacyStatus, string> = {
  removed: '위치 정보 제거됨',
  converted: '위치 정보 제거됨',
  none: '위치 정보 없음',
};

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return (base || 'Untitled').slice(0, 200);
}

/** 촬영일이 없으면 올해로 채운다 — `year`는 비워 둘 수 없다. */
function exifYear(metadata: unknown, fallback: number | null = null): string {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate']) {
    const value = meta[key];
    if (typeof value === 'string') {
      const match = value.match(/(\d{4})/);
      if (match) return match[1];
    }
  }
  return String(fallback ?? new Date().getFullYear());
}

export default function PhotoUploadPanel({ albumSlug, albumTitle, onPendingChange, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyCounter = useRef(0);
  // 언마운트 시 되돌려줄 object URL 목록. rows에서 읽으면 클로저가 낡는다.
  const previewUrls = useRef<string[]>([]);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => { onPendingChange(rows.length); }, [rows.length, onPendingChange]);

  const updateRow = useCallback((key: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(row => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const dropRows = useCallback((keep: (row: Row) => boolean) => {
    setRows(prev => {
      for (const row of prev) {
        if (keep(row)) continue;
        URL.revokeObjectURL(row.preview);
        previewUrls.current = previewUrls.current.filter(url => url !== row.preview);
      }
      return prev.filter(keep);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || !albumSlug) return;
    setMessage(null);

    const files = Array.from(fileList).filter(isImageFile);
    if (files.length === 0) {
      setMessage({ tone: 'error', text: '이미지 파일만 올릴 수 있습니다.' });
      return;
    }

    const room = MAX_BATCH - rows.length;
    if (room <= 0) {
      setMessage({ tone: 'error', text: `한 번에 ${MAX_BATCH}장까지 저장할 수 있습니다. 먼저 저장해 주세요.` });
      return;
    }
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      setMessage({ tone: 'error', text: `${MAX_BATCH}장을 넘는 ${files.length - accepted.length}장은 제외했습니다.` });
    }

    const newRows: Row[] = accepted.map(file => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      keyCounter.current += 1;
      return {
        key: `row-${keyCounter.current}`,
        fileName: file.name,
        preview,
        status: 'uploading' as const,
        title: titleFromFileName(file.name),
        location: '',
        year: '',
      };
    });
    setRows(prev => [...prev, ...newRows]);

    let sign: SignResponse;
    try {
      sign = await adminFetch<SignResponse>('/api/admin/photos/sign', 'POST', { album_slug: albumSlug });
    } catch (error) {
      const text = errorMessage(error, '업로드 준비에 실패했습니다.');
      for (const row of newRows) updateRow(row.key, { status: 'error', error: text });
      return;
    }

    const queue = newRows.map((row, i) => ({ row, file: accepted[i] }));
    const worker = async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        try {
          // 위치 정보를 지운 파일만 올라간다. 지울 수 없으면 여기서 멈추고 행에 이유가 뜬다.
          const prepared = await prepareUpload(job.file);
          updateRow(job.row.key, { privacy: prepared.status, coord: prepared.coord });
          const uploaded = await uploadToCloudinary(prepared.file, sign);
          updateRow(job.row.key, {
            status: 'ready',
            src: uploaded.secure_url,
            // JPEG로 변환한 파일은 EXIF가 없어 Cloudinary가 촬영일을 모른다 — 미리 읽어 둔 연도.
            year: exifYear(uploaded.image_metadata, prepared.takenYear),
          });
        } catch (error) {
          updateRow(job.row.key, { status: 'error', error: errorMessage(error, '업로드 실패') });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  }, [albumSlug, rows.length, updateRow]);

  /** blur·Enter에만 적용한다 — 키마다 적용하면 개별로 손본 값이 덮여 사라진다. */
  function applyToAll(field: 'location' | 'year', value: string) {
    const next = value.trim();
    if (!next) return;
    setRows(prev => prev.map(row => ({ ...row, [field]: next })));
    setMessage({ tone: 'ok', text: `${field === 'location' ? '장소' : '연도'}를 ${rows.length}장에 적용했습니다.` });
  }

  async function save() {
    const ready = rows.filter(row => row.status === 'ready' && row.src);
    if (ready.length === 0) {
      setMessage({ tone: 'error', text: '저장할 사진이 없습니다.' });
      return;
    }
    const blankTitle = ready.find(row => row.title.trim().length === 0);
    if (blankTitle) {
      setMessage({ tone: 'error', text: `제목이 비어 있습니다 — ${blankTitle.fileName}` });
      return;
    }
    const badYear = ready.find(row => !/^\d{4}$/.test(row.year.trim()));
    if (badYear) {
      setMessage({ tone: 'error', text: `연도는 네 자리로 적어 주세요 — ${badYear.fileName}` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const body = await adminFetch<{ inserted?: number }>('/api/admin/photos', 'POST', {
        album_slug: albumSlug,
        photos: ready.map(row => ({
          src: row.src,
          title: row.title.trim(),
          location: row.location.trim(),
          year: Number(row.year),
          ...(row.coord ? { place_coord: row.coord } : {}),
        })),
      });
      // 업로드에 실패한 행은 남겨 둔다 — 다시 시도할 대상이 화면에 보여야 한다.
      dropRows(row => row.status === 'error');
      setMessage({ tone: 'ok', text: `${body.inserted ?? ready.length}장을 아카이브에 추가했습니다.` });
      onSaved();
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, '저장에 실패했습니다.') });
    } finally {
      setSaving(false);
    }
  }

  const uploading = rows.some(row => row.status === 'uploading');
  // 저장 전에 떠나면 파일이 Cloudinary에만 남고 아무도 가리키지 않는다. 실패한 행은 제외.
  useUnsavedGuard('photo-upload', saving || rows.some(row => row.status !== 'error'));
  const readyCount = rows.filter(row => row.status === 'ready').length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        className={`rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-forest bg-moss-wash' : 'border-input bg-canvas'
        } ${!albumSlug ? 'opacity-50' : ''}`}
      >
        <p className="text-sm text-slate">
          {albumSlug
            ? <>사진을 여기에 끌어다 놓으세요{albumTitle && <> — <span className="text-ink">{albumTitle}</span> 앨범</>}</>
            : '먼저 앨범을 선택하세요.'}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!albumSlug}
          className={`btn-outline ${BTN_SM} mt-4`}
        >
          파일 선택
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={e => { void handleFiles(e.target.files); e.target.value = ''; }}
        />
        <p className="mt-3 text-[12px] text-muted-foreground">
          촬영 연도는 EXIF에서 자동으로 채웁니다. 없으면 올해로 들어가니 확인해 주세요.
        </p>
        <p className="mx-auto mt-1 max-w-md text-[12px] text-muted-foreground">
          올리기 전에 브라우저에서 사진의 위치 정보(GPS)를 지웁니다. 원본은 주소만 알면 누구나 받을 수
          있어서입니다. 장소 좌표는 소수점 한 자리(약 11km)로만 남깁니다.
        </p>
      </div>

      <StatusLine message={message} />

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label-ko text-muted-foreground">대기 중 {rows.length}장</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { dropRows(() => false); setMessage(null); }}
                // 업로드 중에도 막는다 — 비워도 업로드는 취소되지 않아 가리킬 것 없는 파일이 쌓인다.
                disabled={saving || uploading}
                className={`btn-ghost ${BTN_SM} text-slate`}
              >
                비우기
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || uploading || readyCount === 0}
                className={`btn-primary ${BTN_SM}`}
              >
                {saving ? '저장 중…' : `저장${readyCount > 0 ? ` (${readyCount})` : ''}`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p className="-mb-1 text-[12px] text-muted-foreground sm:col-span-2">
              입력한 뒤 Enter를 누르거나 칸 밖을 클릭하면 아래 전체에 적용됩니다.
            </p>
            <div>
              <label htmlFor="bulk-location" className={LABEL_CLASS}>장소 일괄 적용</label>
              <input
                id="bulk-location"
                className={INPUT_CLASS}
                placeholder="서울"
                onBlur={e => applyToAll('location', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); applyToAll('location', e.currentTarget.value); } }}
              />
            </div>
            <div>
              <label htmlFor="bulk-year" className={LABEL_CLASS}>연도 일괄 적용</label>
              <input
                id="bulk-year"
                inputMode="numeric"
                className={INPUT_CLASS}
                placeholder="2025"
                onBlur={e => applyToAll('year', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); applyToAll('year', e.currentTarget.value); } }}
              />
            </div>
          </div>

          <ul className="space-y-3">
            {rows.map(row => (
              <li key={row.key} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.preview}
                  alt=""
                  className={`h-16 w-16 shrink-0 rounded-md bg-surface object-cover ${row.status === 'uploading' ? 'animate-pulse opacity-60' : ''}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{row.fileName}</p>
                      {row.privacy && (
                        <span
                          className={`chip ${CHIP_KO} shrink-0 ${row.privacy === 'none' ? 'text-muted-foreground' : 'border-forest/30 text-forest'}`}
                        >
                          {PRIVACY_BADGE[row.privacy]}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dropRows(r => r.key !== row.key)}
                      className="shrink-0 rounded-full px-2 py-1 text-[12px] text-slate transition-colors hover:text-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      제거
                    </button>
                  </div>

                  {row.status === 'uploading' && (
                    <p className="label-ko animate-pulse text-muted-foreground">올리는 중…</p>
                  )}
                  {row.status === 'error' && <p className="text-[13px] text-brick">{row.error}</p>}
                  {row.privacy === 'converted' && row.status !== 'error' && (
                    <p className="text-[12px] text-slate">{CONVERTED_NOTICE}</p>
                  )}
                  {row.status === 'ready' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1.5fr_0.8fr]">
                      <input
                        className={INPUT_COMPACT}
                        aria-label={`${row.fileName} 제목`}
                        placeholder="제목"
                        value={row.title}
                        onChange={e => updateRow(row.key, { title: e.target.value })}
                      />
                      <input
                        className={INPUT_COMPACT}
                        aria-label={`${row.fileName} 장소`}
                        placeholder="장소"
                        value={row.location}
                        onChange={e => updateRow(row.key, { location: e.target.value })}
                      />
                      <input
                        className={INPUT_COMPACT}
                        aria-label={`${row.fileName} 연도`}
                        inputMode="numeric"
                        placeholder="연도"
                        value={row.year}
                        onChange={e => updateRow(row.key, { year: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
