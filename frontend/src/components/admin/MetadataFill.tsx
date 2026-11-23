"use client";

import { useEffect, useRef, useState } from 'react';
import { AdminApiError, adminFetch, errorMessage } from '@/lib/admin/client';
import { ARCHIVE_EXTRAS_MIGRATION } from '@/lib/admin/limits';
import { LoadingLine, MigrationNotice, SectionHeader, StatusLine, type Message } from './AdminUi';
import { BTN_SM, PANEL_CLASS } from './adminStyles';

interface Progress {
  total: number;
  remaining: number;
  migrationPending: boolean;
}

interface BatchResult {
  processed: number;
  withExif: number;
  placesAdded: Array<{ name: string; lat: number; lng: number }>;
  rateLimited: boolean;
  placesMigrationPending: boolean;
  total: number;
  remaining: number;
}

export default function MetadataFill({ onPlacesAdded }: { onPlacesAdded: () => void }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [session, setSession] = useState({ processed: 0, withExif: 0, places: 0 });
  const stopRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await adminFetch<Progress>('/api/admin/photos/metadata');
        if (!cancelled) setProgress(next);
      } catch (e) {
        if (!cancelled) setMessage({ tone: 'error', text: errorMessage(e, '진행 상황을 불러오지 못했습니다.') });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    stopRef.current = false;
    setRunning(true);
    setMessage(null);
    const tally = { processed: 0, withExif: 0, places: 0 };
    setSession(tally);
    try {
      for (;;) {
        const batch = await adminFetch<BatchResult>('/api/admin/photos/metadata', 'POST');
        tally.processed += batch.processed;
        tally.withExif += batch.withExif;
        tally.places += batch.placesAdded.length;
        setSession({ ...tally });
        setProgress({ total: batch.total, remaining: batch.remaining, migrationPending: false });
        if (batch.placesAdded.length > 0) onPlacesAdded();

        if (batch.remaining === 0) {
          setMessage({ tone: 'ok', text: `끝났습니다. ${tally.processed}장을 확인했고 ${tally.withExif}장에 촬영 정보가 있었습니다.` });
          break;
        }
        if (batch.rateLimited) {
          setMessage({
            tone: 'error',
            text: 'Cloudinary 호출 한도에 가까워 멈췄습니다. 한 시간쯤 뒤에 다시 누르면 남은 사진부터 이어서 합니다.',
          });
          break;
        }
        if (batch.processed === 0) {
          // 한 장도 못 했으면 멈춘다 — Cloudinary가 계속 실패하는데 같은 요청을 되풀이하지 않는다.
          setMessage({ tone: 'error', text: 'Cloudinary에서 정보를 읽지 못했습니다. 잠시 뒤에 다시 시도해 주세요.' });
          break;
        }
        if (stopRef.current) {
          setMessage({ tone: 'ok', text: `멈췄습니다. ${tally.processed}장을 확인했습니다 — 다시 누르면 이어서 합니다.` });
          break;
        }
      }
    } catch (e) {
      if (e instanceof AdminApiError && e.migration) {
        setProgress(prev => ({ total: prev?.total ?? 0, remaining: prev?.remaining ?? 0, migrationPending: true }));
      } else {
        setMessage({ tone: 'error', text: errorMessage(e, '촬영 정보를 채우지 못했습니다.') });
      }
    } finally {
      setRunning(false);
    }
  }

  const done = progress ? progress.total - progress.remaining : 0;
  const percent = progress && progress.total > 0 ? Math.round((done / progress.total) * 100) : 0;

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      <SectionHeader
        eyebrow="촬영 정보"
        title="촬영 정보 채우기"
        description="Cloudinary 원본에 남아 있는 크기와 EXIF(카메라·초점거리·조리개·셔터·ISO·촬영일)를 사진마다 저장합니다. 사진 GPS로는 장소마다 대략의 좌표(소수점 한 자리)만 만들고, 사진별 위치는 저장하지 않습니다."
        actions={
          progress && !progress.migrationPending ? (
            running ? (
              <button type="button" onClick={() => { stopRef.current = true; }} className={`btn-outline ${BTN_SM}`}>
                멈추기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void run()}
                disabled={progress.remaining === 0}
                className={`btn-outline ${BTN_SM}`}
              >
                {progress.remaining === 0 ? '모두 확인함' : done > 0 ? '이어서 채우기' : '촬영 정보 채우기'}
              </button>
            )
          ) : null
        }
      />

      {!progress ? (
        message ? null : <LoadingLine />
      ) : progress.migrationPending ? (
        <MigrationNotice feature="촬영 정보 채우기 기능" file={ARCHIVE_EXTRAS_MIGRATION} />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-body">
            <span>
              전체 <span className="tabular-nums">{progress.total}</span>장 중{' '}
              <strong className="font-medium text-ink tabular-nums">{done}</strong>장 확인
              {progress.remaining > 0 && (
                <span className="text-slate">
                  {' '}· 남은 사진 <span className="tabular-nums">{progress.remaining}</span>장
                </span>
              )}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="촬영 정보 확인 진행률"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={done}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full w-full origin-left rounded-full bg-forest transition-transform duration-500" style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
          {(running || session.processed > 0) && (
            <p className="text-[13px] text-slate">
              이번에 {session.processed}장 확인 · 촬영 정보 {session.withExif}장
              {session.places > 0 && ` · 장소 좌표 ${session.places}곳 추가`}
              {running && '…'}
            </p>
          )}
        </div>
      )}
      <StatusLine message={message} />
    </section>
  );
}
