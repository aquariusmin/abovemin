"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { INPUT_CLASS } from './adminStyles';

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
 * 않지만 용량은 차지하므로, 정리는 Cloudinary 콘솔에서 한다.
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

interface SignResponse {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: Record<string, string | number>;
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
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

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
      const res = await fetch('/api/admin/photos/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album_slug: albumSlug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '업로드 준비에 실패했습니다.');
      }
      sign = await res.json();
    } catch (error) {
      const text = error instanceof Error ? error.message : '업로드 준비에 실패했습니다.';
      for (const row of newRows) updateRow(row.key, { status: 'error', error: text });
      return;
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`;
    const queue = [...newRows.map((row, i) => ({ row, file: accepted[i] }))];

    const worker = async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        try {
          const form = new FormData();
          form.append('file', job.file);
          form.append('api_key', sign.apiKey);
          form.append('signature', sign.signature);
          for (const [key, value] of Object.entries(sign.params)) form.append(key, String(value));

          const res = await fetch(endpoint, { method: 'POST', body: form });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || !body.secure_url) {
            throw new Error(body?.error?.message || `업로드 실패 (${res.status})`);
          }
          updateRow(job.row.key, {
            status: 'ready',
            src: body.secure_url as string,
            year: exifYear(body.image_metadata),
          });
        } catch (error) {
          updateRow(job.row.key, {
            status: 'error',
            error: error instanceof Error ? error.message : '업로드 실패',
          });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  }, [albumSlug, rows.length, updateRow]);

  function applyToAll(field: 'location' | 'year', value: string) {
    if (!value) return;
    setRows(prev => prev.map(row => ({ ...row, [field]: value })));
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
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album_slug: albumSlug,
          photos: ready.map(row => ({
            src: row.src,
            title: row.title.trim(),
            location: row.location.trim(),
            year: Number(row.year),
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '저장에 실패했습니다.');

      // 업로드에 실패한 행은 남겨 둔다 — 다시 시도할 대상이 화면에 보여야 한다.
      dropRows(row => row.status === 'error');
      setMessage({ tone: 'ok', text: `${body.inserted ?? ready.length}장을 아카이브에 추가했습니다.` });
      onSaved();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '저장에 실패했습니다.' });
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
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`rounded-sm border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-accent bg-surface' : 'border-border-light'
        } ${!albumSlug ? 'opacity-50' : ''}`}
      >
        <p className="text-sm text-slate break-keep">
          {albumSlug
            ? <>사진을 여기에 끌어다 놓으세요{albumTitle && <> — <span className="text-ink">{albumTitle}</span> 앨범</>}</>
            : '먼저 앨범을 선택하세요.'}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!albumSlug}
          className="btn-outline mt-4 text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
        >
          파일 선택
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <p className="mt-3 text-[11px] text-muted-foreground">
          촬영 연도는 EXIF에서 자동으로 채웁니다. 없으면 올해로 들어가니 확인해 주세요.
        </p>
      </div>

      <p role="status" aria-live="polite" className={message ? `text-[11px] ${message.tone === 'ok' ? 'text-forest' : 'text-brick'}` : 'sr-only'}>
        {message?.text ?? ''}
      </p>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="label-ko text-muted-foreground">대기 중 {rows.length}장</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { dropRows(() => false); setMessage(null); }}
                disabled={saving}
                className="text-[11px] uppercase tracking-widest text-slate hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1 disabled:opacity-50"
              >
                비우기
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || uploading || readyCount === 0}
                className="btn-primary text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
              >
                {saving ? '저장 중...' : `저장${readyCount > 0 ? ` (${readyCount})` : ''}`}
              </button>
            </div>
          </div>

          {/* 한 번에 올리는 사진은 대개 장소와 연도가 같다 — 한 줄로 전체에 적용한다. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bulk-location" className="block label-ko text-muted-foreground mb-1.5">장소 일괄 적용</label>
              <input
                id="bulk-location"
                className={INPUT_CLASS}
                placeholder="Seoul"
                onChange={e => applyToAll('location', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="bulk-year" className="block label-ko text-muted-foreground mb-1.5">연도 일괄 적용</label>
              <input
                id="bulk-year"
                inputMode="numeric"
                className={INPUT_CLASS}
                placeholder="2025"
                onChange={e => applyToAll('year', e.target.value)}
              />
            </div>
          </div>

          <ul className="space-y-3">
            {rows.map(row => (
              <li key={row.key} className="flex gap-3 items-start rounded-sm border border-border-light p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.preview}
                  alt=""
                  className={`h-16 w-16 shrink-0 rounded-sm object-cover bg-surface ${row.status === 'uploading' ? 'animate-pulse opacity-60' : ''}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{row.fileName}</p>
                    <button
                      type="button"
                      onClick={() => dropRows(r => r.key !== row.key)}
                      className="shrink-0 text-[11px] uppercase tracking-widest text-slate hover:text-brick transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1"
                    >
                      제거
                    </button>
                  </div>

                  {row.status === 'uploading' && (
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Uploading...</p>
                  )}
                  {row.status === 'error' && (
                    <p className="text-[11px] text-brick break-keep">{row.error}</p>
                  )}
                  {row.status === 'ready' && (
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_0.8fr] gap-2">
                      <input
                        className={INPUT_CLASS}
                        aria-label={`${row.fileName} 제목`}
                        placeholder="제목"
                        value={row.title}
                        onChange={e => updateRow(row.key, { title: e.target.value })}
                      />
                      <input
                        className={INPUT_CLASS}
                        aria-label={`${row.fileName} 장소`}
                        placeholder="장소"
                        value={row.location}
                        onChange={e => updateRow(row.key, { location: e.target.value })}
                      />
                      <input
                        className={INPUT_CLASS}
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
