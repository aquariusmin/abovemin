"use client";

import { useState } from 'react';

/**
 * Cloudinary에 남아 있지만 사이트에서는 쓰이지 않는 파일을 보여 준다.
 *
 * 지우지는 않는다. 사진을 내릴 때 원본을 남기는 것은 의도된 설계이고
 * (`api/admin/photos`의 DELETE 주석 참고), 그 결정을 이 화면이 뒤집지
 * 않는다. 여기서 하는 일은 "콘솔에서 이건 지워도 된다"를 알려 주는 것까지다 —
 * 그 목록이 없어서 지금까지는 용량 정리를 할 수 없었다.
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
  /** 훑은 자산 중 쓰이는 것. */
  matched: number;
  /** DB가 참조하는 총 자산 수 — 일부는 훑은 접두사 밖에 있다. */
  referenced: number;
  orphans: Orphan[];
  totalBytes: number;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function OrphanScan() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orphans');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '조회에 실패했습니다.');
      setResult(body as ScanResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-sm border border-border-light bg-canvas p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground mb-1">Cloudinary</p>
          <p className="font-serif text-base font-medium tracking-tight text-ink">
            쓰이지 않는 원본 찾기
          </p>
        </div>
        <button
          type="button"
          onClick={scan}
          disabled={loading}
          className="btn-outline text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
        >
          {loading ? '확인 중...' : '확인'}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground break-keep">
        사진을 내려도 Cloudinary의 원본은 그대로 둡니다. 여기서 찾은 파일은
        사이트 어디에서도 쓰이지 않으므로 콘솔에서 지워도 됩니다 —{' '}
        <strong className="text-ink-body">이 화면은 지우지 않습니다.</strong>
      </p>

      <p role="status" aria-live="polite" className={error ? 'text-[11px] text-brick' : 'sr-only'}>
        {error ?? ''}
      </p>

      {result && (
        <div className="space-y-3 border-t border-hairline pt-4">
          <p className="text-sm text-ink-body">
            자산 {result.scanned}개 중 {result.matched}개 사용 중 ·{' '}
            <strong className={result.orphans.length > 0 ? 'text-brick' : 'text-forest'}>
              미사용 {result.orphans.length}개
            </strong>
            {result.orphans.length > 0 && ` (${mb(result.totalBytes)})`}
          </p>

          {result.truncated && (
            <p className="text-[11px] text-brick break-keep">
              자산이 조회 상한을 넘었습니다. 이 목록은 일부입니다 — 지운 뒤 다시 확인하세요.
            </p>
          )}

          {result.orphans.length > 0 && (
            <ul className="max-h-80 overflow-y-auto divide-y divide-hairline text-[11px]">
              {result.orphans.map(o => (
                <li key={o.publicId} className="flex items-center justify-between gap-3 py-2">
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline min-w-0 truncate font-mono text-muted-foreground hover:text-accent"
                  >
                    {o.publicId}
                  </a>
                  <span className="shrink-0 tabular-nums text-slate">{mb(o.bytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
