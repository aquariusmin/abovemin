"use client";

import { useEffect, useState } from 'react';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { ARCHIVE_EXTRAS_MIGRATION } from '@/lib/admin/limits';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, type Message } from './AdminUi';
import { BTN_SM, CHIP_KO, FILTER_CHIP_CLASS, INPUT_COMPACT, PANEL_CLASS } from './adminStyles';

/**
 * 장소 좌표 — `/archive`의 "지도로 보기"가 점을 찍는 자리.
 *
 * 장소 이름 하나에 좌표 하나, 소수점 한 자리(약 11km)다. 촬영 정보 채우기가
 * 사진 GPS의 중앙값으로 비어 있는 장소를 채우고("GPS"), 여기서 고치면 "직접"이
 * 된다. 채우기는 이미 있는 좌표를 덮어쓰지 않는다.
 *
 * 좌표가 없는 장소는 지도에서 빠질 뿐이다 — 필터와 앨범은 그대로다.
 */

interface PlaceRow {
  name: string;
  count: number;
  lat: number | null;
  lng: number | null;
  source: 'gps' | 'manual' | null;
}

type View = 'all' | 'missing';

const SOURCE_CHIP: Record<'gps' | 'manual' | 'none', { label: string; className: string }> = {
  gps: { label: 'GPS 자동', className: `chip ${CHIP_KO} border-forest/25 bg-moss-wash text-forest` },
  manual: { label: '직접 입력', className: `chip ${CHIP_KO} border-cream-deep bg-cream text-secondary-foreground` },
  none: { label: '좌표 없음', className: `chip ${CHIP_KO} border-brick-soft text-brick` },
};

export default function PlacesEditor({ reloadKey }: { reloadKey: number }) {
  const [rows, setRows] = useState<PlaceRow[] | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [view, setView] = useState<View>('all');
  const [message, setMessage] = useState<Message | null>(null);
  const [localReload, setLocalReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ places: PlaceRow[]; migrationPending: boolean }>('/api/admin/places');
        if (cancelled) return;
        setRows(data.places);
        setMigrationPending(data.migrationPending);
      } catch (e) {
        if (!cancelled) setMessage({ tone: 'error', text: errorMessage(e, '장소를 불러오지 못했습니다.') });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, localReload]);

  const missing = rows?.filter(row => row.lat === null && row.count > 0).length ?? 0;
  const shown = (rows ?? []).filter(row => view === 'all' || row.lat === null);

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      <SectionHeader
        eyebrow="지도"
        title="장소 좌표"
        description={
          <>
            공개 아카이브의 &ldquo;지도로 보기&rdquo;에 찍히는 점입니다. 좌표는 소수점 한 자리(약 11km)로만 저장됩니다 —
            지도 앱에서 <span className="font-mono text-[12px]">37.5665, 126.9780</span>을 붙여 넣어도 괜찮습니다.
          </>
        }
      />

      {migrationPending ? (
        <MigrationNotice feature="장소 좌표와 지도 기능" file={ARCHIVE_EXTRAS_MIGRATION} />
      ) : !rows ? (
        message ? null : <LoadingLine />
      ) : rows.length === 0 ? (
        <EmptyLine>장소가 적힌 사진이 없습니다.</EmptyLine>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="보기">
            <button type="button" className={FILTER_CHIP_CLASS} data-active={view === 'all'} aria-pressed={view === 'all'} onClick={() => setView('all')}>
              전체 <span className="tabular-nums">{rows.length}</span>
            </button>
            <button type="button" className={FILTER_CHIP_CLASS} data-active={view === 'missing'} aria-pressed={view === 'missing'} onClick={() => setView('missing')}>
              좌표 없음 <span className="tabular-nums">{missing}</span>
            </button>
          </div>

          {shown.length === 0 ? (
            <EmptyLine>모든 장소에 좌표가 있습니다.</EmptyLine>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shown.map(row => (
                <PlaceEditRow
                  // 저장·지우기 뒤 다시 읽은 값으로 입력칸을 새로 채운다.
                  key={`${row.name}|${row.lat}|${row.lng}`}
                  row={row}
                  onSaved={text => {
                    setMessage({ tone: 'ok', text });
                    setLocalReload(k => k + 1);
                  }}
                  onError={text => setMessage({ tone: 'error', text })}
                />
              ))}
            </ul>
          )}
        </>
      )}
      <StatusLine message={message} />
    </section>
  );
}

/** "37.5665, 126.9780"처럼 붙여 넣은 한 쌍. 아니면 null. */
function parsePair(text: string): [string, string] | null {
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  return match ? [match[1], match[2]] : null;
}

function PlaceEditRow({
  row,
  onSaved,
  onError,
}: {
  row: PlaceRow;
  onSaved: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [lat, setLat] = useState(row.lat === null ? '' : String(row.lat));
  const [lng, setLng] = useState(row.lng === null ? '' : String(row.lng));
  const [busy, setBusy] = useState(false);
  const chip = SOURCE_CHIP[row.source ?? 'none'];
  const dirty = lat !== (row.lat === null ? '' : String(row.lat)) || lng !== (row.lng === null ? '' : String(row.lng));
  const id = `place-${encodeURIComponent(row.name)}`;

  async function save() {
    if (lat.trim() === '' || lng.trim() === '') {
      onError(`“${row.name}”: 위도와 경도를 모두 적어 주세요.`);
      return;
    }
    setBusy(true);
    try {
      const result = await adminFetch<{ place: { lat: number; lng: number } }>('/api/admin/places', 'PUT', {
        name: row.name,
        lat: Number(lat),
        lng: Number(lng),
      });
      onSaved(`“${row.name}” 좌표를 ${result.place.lat}, ${result.place.lng}로 저장했습니다.`);
    } catch (e) {
      onError(`“${row.name}”: ${errorMessage(e, '저장하지 못했습니다.')}`);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    try {
      await adminFetch('/api/admin/places', 'DELETE', { name: row.name });
      onSaved(`“${row.name}” 좌표를 지웠습니다. 지도에서 빠집니다.`);
    } catch (e) {
      onError(`“${row.name}”: ${errorMessage(e, '지우지 못했습니다.')}`);
    } finally {
      setBusy(false);
    }
  }

  function pastePair(event: React.ClipboardEvent<HTMLInputElement>) {
    const pair = parsePair(event.clipboardData.getData('text'));
    if (!pair) return;
    event.preventDefault();
    setLat(pair[0]);
    setLng(pair[1]);
  }

  return (
    <li className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-ink">{row.name}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {row.count > 0 ? `${row.count}장` : '쓰는 사진 없음'}
        </span>
        <span className={chip.className}>{chip.label}</span>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor={`${id}-lat`} className="sr-only">{row.name} 위도</label>
        <input
          id={`${id}-lat`}
          inputMode="decimal"
          className={`${INPUT_COMPACT} w-24 font-mono tabular-nums`}
          placeholder="위도"
          value={lat}
          onChange={event => setLat(event.target.value)}
          onPaste={pastePair}
        />
        <label htmlFor={`${id}-lng`} className="sr-only">{row.name} 경도</label>
        <input
          id={`${id}-lng`}
          inputMode="decimal"
          className={`${INPUT_COMPACT} w-24 font-mono tabular-nums`}
          placeholder="경도"
          value={lng}
          onChange={event => setLng(event.target.value)}
          onPaste={pastePair}
        />
        <button type="submit" disabled={busy || !dirty} className={`btn-outline ${BTN_SM}`}>
          저장
        </button>
        {row.lat !== null && (
          <button type="button" onClick={() => void clear()} disabled={busy} className={`btn-ghost ${BTN_SM} text-slate`}>
            지우기
          </button>
        )}
      </form>
    </li>
  );
}
