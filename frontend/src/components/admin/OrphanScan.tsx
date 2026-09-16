"use client";

import { useState } from 'react';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { MAX_ORPHAN_DELETE } from '@/lib/admin/limits';
import { SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { BTN_SM, CHECKBOX_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * Cloudinary에 남아 있지만 사이트 어디에서도 쓰이지 않는 파일 — 찾고, 골라서 지운다.
 *
 * 사진을 내릴 때 원본을 바로 지우지 않는 것은 의도된 설계이고
 * (`api/admin/photos`의 DELETE 주석), 파기는 여기서 따로 한다. 지우는 순간
 * 서버가 참조를 **다시** 확인하므로, 스캔 뒤에 커버로 걸린 파일은 목록에
 * 있더라도 지워지지 않는다(`api/admin/orphans` DELETE).
 *
 * 자동으로 돌지 않는다. Cloudinary Admin API는 호출 쿼터가 있고, 이건 몇
 * 달에 한 번 들여다보는 종류의 화면이다.
 */
interface Orphan {
  publicId: string;
  url: string;
  bytes: number;
  createdAt: string;
}

interface ScanResult {
  scanned: number;
  truncated: boolean;
  matched: number;
  referenced: number;
  orphans: Orphan[];
  totalBytes: number;
}

interface DeleteResult {
  deleted: string[];
  notFound: string[];
  refused: Array<{ publicId: string; reason: 'referenced' | 'outside_prefix' }>;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function OrphanScan() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  async function scan() {
    setLoading(true);
    setMessage(null);
    try {
      setResult(await adminFetch<ScanResult>('/api/admin/orphans'));
      setSelected(new Set());
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, '조회에 실패했습니다.') });
    } finally {
      setLoading(false);
    }
  }

  const orphans = result?.orphans ?? [];
  const chosen = orphans.filter(o => selected.has(o.publicId));
  const chosenBytes = chosen.reduce((sum, o) => sum + o.bytes, 0);
  const allSelected = orphans.length > 0 && chosen.length === orphans.length;

  function toggle(publicId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  async function remove() {
    if (chosen.length === 0) return;
    if (chosen.length > MAX_ORPHAN_DELETE) {
      setMessage({ tone: 'error', text: `한 번에 ${MAX_ORPHAN_DELETE}개까지 지울 수 있습니다.` });
      return;
    }
    const ok = await confirm({
      title: `원본 ${chosen.length}개(${mb(chosenBytes)})를 영구히 지울까요?`,
      body: (
        <>
          <p>Cloudinary에서 파일 자체가 지워집니다. <strong className="font-medium text-brick">되돌릴 수 없습니다.</strong></p>
          <p className="text-slate">
            지우기 직전에 서버가 사이트의 모든 참조(사진·앨범 커버·상품·히어로)를 다시 확인하고, 그 사이 쓰이게 된 파일은 건너뜁니다.
          </p>
        </>
      ),
      confirmLabel: `${chosen.length}개 영구 삭제`,
    });
    if (!ok) return;

    setDeleting(true);
    setMessage(null);
    try {
      const res = await adminFetch<DeleteResult>('/api/admin/orphans', 'DELETE', {
        public_ids: chosen.map(o => o.publicId),
      });
      const gone = new Set([...res.deleted, ...res.notFound]);
      setResult(prev =>
        prev && {
          ...prev,
          orphans: prev.orphans.filter(o => !gone.has(o.publicId)),
          totalBytes: prev.orphans.filter(o => !gone.has(o.publicId)).reduce((sum, o) => sum + o.bytes, 0),
        },
      );
      setSelected(new Set());
      const refused = res.refused.length > 0 ? ` ${res.refused.length}개는 지금 쓰이고 있거나 범위 밖이라 건너뛰었습니다.` : '';
      setMessage({ tone: res.refused.length > 0 ? 'error' : 'ok', text: `${res.deleted.length}개를 지웠습니다.${refused}` });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, '지우지 못했습니다.') });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      {dialog}
      <SectionHeader
        eyebrow="Cloudinary"
        title="쓰이지 않는 원본 정리"
        description="사진·상품을 내려도 Cloudinary의 원본은 남습니다. 사이트 어디에서도 쓰이지 않는 파일(phorage/archive, phorage/shop)을 찾아 골라 지웁니다."
        actions={
          <button type="button" onClick={() => void scan()} disabled={loading || deleting} className={`btn-outline ${BTN_SM}`}>
            {loading ? '확인 중…' : result ? '다시 확인' : '확인'}
          </button>
        }
      />
      <StatusLine message={message} />

      {result && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm text-ink-body">
            자산 {result.scanned}개 중 {result.matched}개 사용 중 ·{' '}
            <strong className={`font-medium ${orphans.length > 0 ? 'text-brick' : 'text-forest'}`}>미사용 {orphans.length}개</strong>
            {orphans.length > 0 && ` (${mb(result.totalBytes)})`}
          </p>

          {result.truncated && (
            <p className="text-[13px] text-brick">
              자산이 조회 상한을 넘었습니다. 이 목록은 일부입니다 — 지운 뒤 다시 확인하세요.
            </p>
          )}

          {orphans.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate">
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(orphans.slice(0, MAX_ORPHAN_DELETE).map(o => o.publicId)))}
                  />
                  {orphans.length > MAX_ORPHAN_DELETE ? `앞의 ${MAX_ORPHAN_DELETE}개 선택` : '모두 선택'}
                </label>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={chosen.length === 0 || deleting}
                  className={`btn-destructive ${BTN_SM} ml-auto`}
                >
                  {deleting ? '지우는 중…' : `선택 ${chosen.length}개 삭제${chosen.length ? ` (${mb(chosenBytes)})` : ''}`}
                </button>
              </div>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-md border border-border text-[12px]">
                {orphans.map(o => (
                  <li key={o.publicId} className="flex items-center gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      className={CHECKBOX_CLASS}
                      checked={selected.has(o.publicId)}
                      onChange={() => toggle(o.publicId)}
                      aria-label={`${o.publicId} 선택`}
                    />
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline min-w-0 flex-1 truncate font-mono text-muted-foreground hover:text-forest"
                    >
                      {o.publicId}
                    </a>
                    <span className="shrink-0 tabular-nums text-slate">{mb(o.bytes)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
