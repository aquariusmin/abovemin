"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
// 번들에 넣어 지도를 열 때 외부 요청이 없다(CSP 그대로). 110m 해상도(55 KB).
import landTopology from 'world-atlas/land-110m.json';
import {
  REGIONS,
  availableRegions,
  clusterDots,
  dotRadius,
  inRegion,
  type DotCluster,
  type MapPlace,
  type Region,
} from '@/lib/places';

/** 점은 SVG 위의 진짜 `<button>`이다(포커스·스크린리더). SVG 좌표를 컨테이너의 실제 픽셀과 같게 둔다. */

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

const SPHERE = { type: 'Sphere' } as const;

function projectionFor(region: Region, width: number, height: number): GeoProjection {
  const pad = Math.max(16, Math.min(width, height) * 0.06);
  const extent: [[number, number], [number, number]] = [[pad, pad], [width - pad, height - pad]];
  if (!region.bounds) return geoNaturalEarth1().fitExtent(extent, SPHERE);
  const [west, south, east, north] = region.bounds;
  return geoMercator().fitExtent(extent, {
    type: 'MultiPoint',
    coordinates: [[west, south], [east, south], [east, north], [west, north]],
  });
}

interface Props {
  places: MapPlace[];
  selected: string | null;
  onSelect: (name: string) => void;
}

type Cluster = DotCluster<MapPlace>;

function clusterName(cluster: Cluster): string {
  const [first, ...rest] = cluster.members;
  return rest.length === 0 ? first.name : `${first.name} 외 ${rest.length}곳`;
}

export default function PlaceMap({ places, selected, onSelect }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const regions = useMemo(() => availableRegions(places), [places]);
  const [regionId, setRegionId] = useState('world');
  const region = regions.find(r => r.id === regionId) ?? regions[0];
  const [openCluster, setOpenCluster] = useState<string | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize(prev => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const drawing = useMemo(() => {
    if (!size || size.width === 0 || size.height === 0) return null;
    const projection = projectionFor(region, size.width, size.height);
    const path = geoPath(projection);
    const max = Math.max(...places.map(p => p.count), 1);
    const maxRadius = size.width < 640 ? 13 : 18;
    const radius = (count: number) => dotRadius(count, max, { min: 5, maxRadius });
    const dots = places
      .filter(place => inRegion(place, region))
      .map(place => {
        const point = projection([place.lng, place.lat]);
        if (!point) return null;
        const [x, y] = point;
        if (x < 0 || y < 0 || x > size.width || y > size.height) return null;
        return { item: place, x, y, count: place.count };
      })
      .filter((dot): dot is NonNullable<typeof dot> => dot !== null);
    return {
      land: path(land) ?? '',
      sphere: region.bounds ? null : path(SPHERE),
      clusters: clusterDots(dots, radius),
    };
  }, [size, region, places]);

  useEffect(() => {
    if (!openCluster) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenCluster(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCluster]);

  function chooseRegion(id: string) {
    setRegionId(id);
    setOpenCluster(null);
  }

  function pressCluster(cluster: Cluster) {
    if (cluster.members.length === 1) {
      setOpenCluster(null);
      onSelect(cluster.members[0].name);
      return;
    }
    if (!region.bounds) {
      const zoom = REGIONS.filter(r => r.bounds)
        .map(r => ({ region: r, hits: cluster.members.filter(place => inRegion(place, r)).length }))
        .sort((a, b) => b.hits - a.hits)[0];
      if (zoom && zoom.hits >= 2) {
        chooseRegion(zoom.region.id);
        return;
      }
    }
    const key = cluster.members[0].name;
    setOpenCluster(current => (current === key ? null : key));
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label="지역" className="flex flex-wrap gap-2">
        {regions.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => chooseRegion(r.id)}
            data-active={r.id === region.id}
            aria-pressed={r.id === region.id}
            className="btn-outline px-3 py-1.5 text-[13px] sm:px-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {r.label}
          </button>
        ))}
      </div>

      <div
        ref={frameRef}
        id="archive-map"
        className={`relative w-full overflow-hidden rounded-lg border border-border bg-surface max-h-[560px] sm:aspect-[16/9] lg:aspect-[2/1] ${
          region.bounds ? 'aspect-square' : 'aspect-[16/10]'
        }`}
      >
        {drawing && size && (
          <>
            <svg
              aria-hidden
              width={size.width}
              height={size.height}
              viewBox={`0 0 ${size.width} ${size.height}`}
              className="absolute inset-0"
              onClick={() => setOpenCluster(null)}
            >
              {drawing.sphere && <path d={drawing.sphere} className="fill-canvas stroke-border" strokeWidth={1} />}
              <path d={drawing.land} className="fill-moss-wash stroke-forest/25" strokeWidth={0.75} strokeLinejoin="round" />
            </svg>

            <ul className="pointer-events-none absolute inset-0 list-none" aria-label="사진을 찍은 장소">
              {drawing.clusters.map(cluster => {
                const key = cluster.members[0].name;
                const group = cluster.members.length > 1;
                const active = cluster.members.some(place => place.name === selected);
                const open = openCluster === key;
                const edge = cluster.x < 110 ? 'left' : cluster.x > size.width - 110 ? 'right' : 'center';
                const below = cluster.y < 60;
                // 목록은 틀 안쪽으로 연다 — 틀이 `overflow-hidden`이라 바깥으로 열면 잘린다.
                const listBelow = cluster.y < size.height / 2;
                const hit = Math.max(2 * cluster.r, 28);
                const selectedPlace = active && group ? cluster.members.find(p => p.name === selected) : undefined;
                return (
                  <li
                    key={key}
                    className="absolute"
                    style={{ left: cluster.x, top: cluster.y, zIndex: open ? 30 : active ? 20 : 10 }}
                  >
                    <button
                      type="button"
                      onClick={() => pressCluster(cluster)}
                      aria-pressed={group ? undefined : active}
                      aria-expanded={group && region.bounds ? open : undefined}
                      aria-label={
                        group
                          ? `${clusterName(cluster)}, 사진 ${cluster.count}장 — ${region.bounds ? '장소 목록 열기' : '확대'}`
                          : `${key}, 사진 ${cluster.count}장 — ${active ? '선택 해제' : '이 장소로 좁히기'}`
                      }
                      className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none"
                      style={{ width: hit, height: hit }}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream transition-[transform,background-color] duration-200 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-1 ${
                          active ? 'bg-forest-deep ring-2 ring-moss' : 'bg-forest/85 group-hover:bg-forest'
                        }`}
                        style={{ width: 2 * cluster.r, height: 2 * cluster.r }}
                      >
                        {group && cluster.r >= 8 && <span className="absolute inset-[3px] rounded-full border border-cream/60" />}
                      </span>
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute whitespace-nowrap rounded-full bg-forest-black/90 px-2.5 py-1 text-[12px] font-medium leading-none text-cream shadow-xs transition-opacity duration-150 ${
                          below ? 'top-full mt-1' : 'bottom-full mb-1'
                        } ${
                          edge === 'left' ? 'left-0' : edge === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
                        } ${active && !open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                      >
                        {selectedPlace?.name ?? clusterName(cluster)}
                        <span className="ml-1.5 tabular-nums text-cream/70">{selectedPlace?.count ?? cluster.count}</span>
                      </span>
                    </button>

                    {open && (
                      <ul
                        aria-label={`${clusterName(cluster)}에 묶인 장소`}
                        className={`pointer-events-auto absolute max-h-56 w-max max-w-[14rem] space-y-0.5 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-md ${
                          listBelow ? 'top-4' : 'bottom-4'
                        } ${edge === 'left' ? 'left-0' : edge === 'right' ? 'right-0' : '-translate-x-1/2'}`}
                      >
                        {cluster.members.map(place => (
                          <li key={place.name}>
                            <button
                              type="button"
                              // 목록이 열리면 첫 장소로 포커스를 옮긴다 — 키보드로 연 사람이 다시 찾아 들어오지 않게.
                              autoFocus={place === cluster.members[0]}
                              onClick={() => {
                                setOpenCluster(null);
                                onSelect(place.name);
                              }}
                              aria-pressed={place.name === selected}
                              className="flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-body hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:bg-moss-wash aria-pressed:text-forest"
                            >
                              <span>{place.name}</span>
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">{place.count}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground">
        점이 클수록 사진이 많습니다. 위치는 도시 단위로만 표시합니다. 겹친 점을 누르면 펼쳐지고, 장소를 누르면 그곳 사진만 남습니다.
      </p>
    </div>
  );
}
