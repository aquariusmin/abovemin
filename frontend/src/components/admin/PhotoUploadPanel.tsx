"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch, errorMessage, uploadToCloudinary, type SignResponse } from '@/lib/admin/client';
import { StatusLine, type Message } from './AdminUi';
import { BTN_SM, INPUT_COMPACT, LABEL_CLASS, INPUT_CLASS } from './adminStyles';

/**
 * 새 사진 업로드.
 *
 * 흐름은 두 단계다.
 *  1) 파일을 놓으면 **곧바로** Cloudinary로 올라간다 (서버를 거치지 않는다 —
 *     `lib/cloudinary-upload.ts` 참고). 업로드 응답의 EXIF로 촬영 연도가 미리
 *     채워지므로, 관리자가 타이핑을 시작할 때 이미 대부분 채워져 있다.
 *  2) 제목/장소/연도를 확인한 뒤 "저장"을 눌러야 `photos` 행이 생긴다.
 *
 * 저장하지 않고 화면을 떠나면 Cloudinary에는 파일이 남는다. 사이트에는 노출되지
 * 않고, 설정 탭의 "쓰이지 않는 원본"에서 찾아 지울 수 있다.
 */

type RowStatus = 'uploading' | 'ready' | 'error';

interface Row {
  key: string;
  fileName: string;
  /** 업로드 중에도 썸네일을 보여주기 위한 로컬 object URL. */
  preview: string;
  status: RowStatus;
  error?: string;
  src?: string;
  title: string;
  location: string;
  year: string;
}

interface Props {
  albumSlug: string;
  albumTitle: string;
  /** 부모가 앨범 선택을 잠그기 위해 대기 중인 장수를 알아야 한다. */
  onPendingChange: (count: number) => void;
  /** 저장이 끝나면 아래 목록이 새 사진을 다시 불러온다. */
  onSaved: () => void;
}

/** 동시 업로드 수. 원본 사진은 장당 수 MB라 무제한으로 열면 회선만 막힌다. */
const CONCURRENCY = 3;
const MAX_BATCH = 60;

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return (base || 'Untitled').slice(0, 200);
}

/**
 * EXIF 촬영일에서 연도만 꺼낸다. Cloudinary는 `2017:08:12 10:22:33` 형식으로
 * 돌려준다. 촬영일이 없는 파일(스캔본, 스크린샷 등)은 올해로 채우고 관리자가
 * 고치도록 둔다 — `year`는 비워 둘 수 없는 값이다.
 */
function exifYear(metadata: unknown): string {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate']) {
    const value = meta[key];
    if (typeof value === 'string') {
      const match = value.match(/(\d{4})/);
      if (match) return match[1];
    }
  }
  return String(new Date().getFullYear());
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

  /** 목록에서 빠지는 행의 object URL을 되돌려준다 — 원본 사진은 장당 수 MB다. */
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

    const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
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
          const uploaded = await uploadToCloudinary(job.file, sign);
          updateRow(job.row.key, {
            status: 'ready',
            src: uploaded.secure_url,
            year: exifYear(uploaded.image_metadata),
          });
        } catch (error) {
          updateRow(job.row.key, { status: 'error', error: errorMessage(error, '업로드 실패') });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  }, [albumSlug, rows.length, updateRow]);

  /**
   * 한 줄로 모든 행의 장소 또는 연도를 채운다.
   *
   * 예전에는 `onChange`에 걸려 있어서 키를 누를 때마다 전체 행을 덮어썼다.
   * "Seoul"을 치면 S → Se → Seo … 가 차례로 모든 행에 적용되고, 그 과정에서
   * 개별로 손봐 둔 값이 되돌릴 방법 없이 사라진다. 이제는 입력을 마쳤다는
   * 신호(blur 또는 Enter)에만 적용한다 — 일괄 적용은 한 번의 의도이지 타이핑
   * 도중의 연속 동작이 아니다.
   */
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
  const readyCount = rows.filter(row => row.status === 'ready').length;

  return (
    <div className="space-y-4">
      {/* 드롭 존 */}
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
                // 업로드 중에도 막는다. 목록을 비워도 업로드는 취소되지 않아서,
                // 파일은 계속 Cloudinary에 쌓이고 화면에는 그걸 가리키는 것이
                // 남지 않는다.
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

          {/* 한 번에 올리는 사진은 대개 장소와 연도가 같다 — 한 줄로 전체에 적용한다.
              적용 시점이 타이핑 도중에서 Enter/blur로 바뀌었으므로(→ `applyToAll`),
              언제 반영되는지 화면에도 적어 둔다. */}
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
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyToAll('location', e.currentTarget.value); } }}
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
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyToAll('year', e.currentTarget.value); } }}
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
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{row.fileName}</p>
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
