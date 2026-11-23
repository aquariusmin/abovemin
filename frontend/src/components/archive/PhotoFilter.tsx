"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PhotoGrid from '@/components/PhotoGrid';
import { cleanCaptionField } from '@/lib/caption';
import { CAMERA_PARAM, cameraOptions, matchesCamera } from '@/lib/camera';
import type { MapPlace } from '@/lib/places';

/** 지도는 열 때만 불러온다(d3-geo + 윤곽 55 KB). 컨테이너 폭을 재서 그리므로 `ssr: false`. */
const PlaceMap = dynamic(() => import('./PlaceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg border border-border bg-surface aspect-[16/10] sm:aspect-[16/9] lg:aspect-[2/1] max-h-[560px] animate-pulse" />
  ),
});

type Photo = {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
  album_slug: string;
  album_title: string;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: number | null;
};

const ALL = '__all__';

/** 한 번에 그리는 최대 장수. 상한이 없으면 /archive가 0.9 MB에서 4.5 MB로 커졌다. */
const PAGE = 48;

const PREVIEW = 12;

export default function PhotoFilter({ photos, mapPlaces = [] }: { photos: Photo[]; mapPlaces?: MapPlace[] }) {
  const [year, setYear] = useState<string>(ALL);
  const [place, setPlace] = useState<string>(ALL);
  const [limit, setLimit] = useState(PAGE);
  const [mapOpen, setMapOpen] = useState(false);
  const [camera, setCameraState] = useState<string>(ALL);

  const cameras = useMemo(() => cameraOptions(photos), [photos]);

  // `?camera=`는 히스토리 API로 한 번 읽는다(`useSearchParams`는 정적 프리렌더를 잃는다). 없는 값은 무시.
  useEffect(() => {
    const read = () => {
      const wanted = new URLSearchParams(window.location.search).get(CAMERA_PARAM);
      if (wanted && cameras.some(option => option.value === wanted)) setCameraState(wanted);
    };
    read();
  }, [cameras]);

  function setCamera(next: string) {
    setCameraState(next);
    const params = new URLSearchParams(window.location.search);
    if (next === ALL) params.delete(CAMERA_PARAM);
    else params.set(CAMERA_PARAM, next);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }

  const years = useMemo(
    () => [...new Set(photos.map(p => p.year).filter(Boolean))].sort((a, b) => b - a),
    [photos],
  );
  const places = useMemo(
    () =>
      [...new Set(photos.map(p => cleanCaptionField(p.location)).filter((v): v is string => v !== null))]
        .sort((a, b) => a.localeCompare(b)),
    [photos],
  );

  const filtered = useMemo(
    () =>
      photos.filter(
        p =>
          (year === ALL || String(p.year) === year) &&
          (place === ALL || p.location?.trim() === place) &&
          (camera === ALL || matchesCamera(p, camera)),
      ),
    [photos, year, place, camera],
  );

  const active = year !== ALL || place !== ALL || camera !== ALL;
  const shown = filtered.slice(0, limit);

  const recent = useMemo(
    () => photos.toSorted((a, b) => b.id - a.id).slice(0, PREVIEW),
    [photos],
  );

  function narrow(next: () => void) {
    next();
    setLimit(PAGE);
  }

  function reset() {
    narrow(() => {
      setYear(ALL);
      setPlace(ALL);
      setCamera(ALL);
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8 md:mb-10 space-y-5 border-y border-hairline py-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
          <span className="label-ko text-muted-foreground sm:w-12 sm:pt-2.5 shrink-0" id="filter-year-label">연도</span>
          <div role="group" aria-labelledby="filter-year-label" className="flex flex-wrap gap-2">
            {[ALL, ...years.map(String)].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => narrow(() => setYear(y))}
                data-active={year === y}
                aria-pressed={year === y}
                className="btn-outline tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {y === ALL ? '전체' : y}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <label htmlFor="filter-place" className="label-ko text-muted-foreground sm:w-12 shrink-0">장소</label>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <PillSelect
              id="filter-place"
              value={place}
              onChange={value => narrow(() => setPlace(value))}
              options={[{ value: ALL, label: '전체 장소' }, ...places.map(p => ({ value: p, label: p }))]}
            />

            {mapPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setMapOpen(open => !open)}
                aria-expanded={mapOpen}
                aria-controls="archive-map-panel"
                className="btn-outline gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M1.5 3.5 5.5 2l5 1.5 4-1.5v10.5l-4 1.5-5-1.5-4 1.5z M5.5 2v10.5 M10.5 3.5V14" strokeLinejoin="round" />
                </svg>
                {mapOpen ? '지도 닫기' : '지도로 보기'}
              </button>
            )}
          </div>
        </div>

        {mapOpen && mapPlaces.length > 0 && (
          <div id="archive-map-panel">
            <PlaceMap
              places={mapPlaces}
              selected={place === ALL ? null : place}
              onSelect={name => narrow(() => setPlace(current => (current === name ? ALL : name)))}
            />
          </div>
        )}

        {cameras.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <label htmlFor="filter-camera" className="label-ko text-muted-foreground sm:w-12 shrink-0">카메라</label>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <PillSelect
                id="filter-camera"
                value={camera}
                onChange={value => narrow(() => setCamera(value))}
                options={[
                  { value: ALL, label: '전체 카메라' },
                  ...cameras.map(option => ({ value: option.value, label: `${option.label} (${option.count})` })),
                ]}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-sm text-slate" aria-live="polite">
            {active
              ? <>전체 {photos.length}장 중 <span className="font-medium text-ink tabular-nums">{filtered.length}장</span></>
              : <>최근 올라온 {recent.length}장입니다. 조건을 고르면 전체 {photos.length}장에서 찾습니다.</>}
          </p>
          {active && (
            <button
              type="button"
              onClick={reset}
              className="btn-ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              조건 초기화
            </button>
          )}
        </div>
      </div>

      {!active ? (
        <PhotoGrid key="recent" photos={recent} eagerFirst={false} />
      ) : filtered.length > 0 ? (
        <>
          {/* 조건이 바뀌면 그리드를 새로 만든다 — 재사용하면 스크롤 리빌이 어긋난다. */}
          <PhotoGrid key={`${year}-${place}-${camera}`} photos={shown} eagerFirst={false} />
          {filtered.length > shown.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setLimit(n => n + PAGE)}
                className="btn-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                더 보기 ({filtered.length - shown.length}장 남음)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center space-y-4">
          <p className="text-base text-slate">조건에 맞는 사진이 없습니다.</p>
          <button type="button" onClick={reset} className="btn-outline">
            조건 초기화
          </button>
        </div>
      )}
    </div>
  );
}

function PillSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const active = value !== ALL;
  return (
    <span className="relative inline-flex items-center">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        data-active={active}
        className="btn-outline appearance-none cursor-pointer pr-10 border-field-edge data-[active=true]:border-primary max-w-[70vw] truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className={`pointer-events-none absolute right-4 h-3 w-3 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
