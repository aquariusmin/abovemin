"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
// 빌드 때 번들에 들어간다 — 지도를 여는 순간 외부로 나가는 요청이 없다(CSP도
// 그대로). 110m 해상도(55 KB)라 제주·홋카이도 정도까지는 형태가 남는다.
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

/**
 * `/archive`의 "지도로 보기". 장소마다 점 하나, 넓이는 사진 수.
 *
 * 이 컴포넌트는 `PhotoFilter`가 `next/dynamic`으로 **열 때만** 불러온다. d3-geo와
 * 세계 윤곽이 아카이브 첫 화면의 번들에 실리지 않는다.
 *
 * 그림은 두 겹이다: 땅은 SVG 한 장, 점은 그 위에 절대 위치로 올린 진짜
 * `<button>`. SVG 안의 `<circle>`로는 탭 포커스·Enter·스크린리더 이름을 전부
 * 손으로 만들어야 하고, 반지름을 viewBox 단위로 주면 폰에서 점이 1px로
 * 줄어든다. 그래서 SVG 좌표계를 컨테이너의 실제 픽셀과 같게 두고(ResizeObserver),
 * 점과 라벨은 화면 픽셀로 그린다.
 *
 * 겹치는 점은 묶는다(`clusterDots`). 묶음을 누르면 그 곳을 담는 지역으로 확대하고,
 * 이미 확대한 뒤라면 묶인 장소의 목록을 연다.
 *
 * 좌표는 소수점 한 자리(약 11km)다 — 점은 "이 근처"이지 촬영 위치가 아니다.
 */

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

const SPHERE = { type: 'Sphere' } as const;

function projectionFor(region: Region, width: number, height: number): GeoProjection {
  const pad = Math.max(16, Math.min(width, height) * 0.06);
  const extent: [[number, number], [number, number]] = [[pad, pad], [width - pad, height - pad]];
  if (!region.bounds) return geoNaturalEarth1().fitExtent(extent, SPHERE);
  const [west, south, east, north] = region.bounds;
  // 지역은 메르카토르 — 좁은 범위에서 사람들이 익숙한 모양이다. 네 모서리를
  // 담도록 맞춘다.
  return geoMercator().fitExtent(extent, {
    type: 'MultiPoint',
    coordinates: [[west, south], [east, south], [east, north], [west, north]],
  });
}

interface Props {
  places: MapPlace[];
  /** 지금 필터에 걸린 장소. 점이 강조되고 라벨이 늘 보인다. */
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
  /** 목록을 연 묶음(첫 장소 이름으로 가리킨다). */
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
    // 작은 화면에서는 점도 조금 작게. 390px 폭에서 가장 큰 점이 지름 26px.
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

  // 목록은 Esc로 닫는다.
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
    // 세계 지도에서 누른 묶음은 먼저 확대한다 — 묶인 장소를 가장 많이 담는 지역으로.
    // 폰 폭에서는 한국과 일본이 한 묶음이 되는데, 그때 스물한 곳짜리 목록을 여는
    // 것보다 한국으로 확대하고 일본은 칩으로 가게 두는 편이 읽기 쉽다.
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
        // 폰에서 세계 지도는 가로로 긴 틀, 지역은 정사각형 틀. 한국·일본은 세로로
        // 길어서 4:3 틀에 맞추면 점 사이가 너무 좁아진다. 틀 크기가 바뀌면
        // ResizeObserver가 투영을 다시 맞춘다.
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
                // 라벨이 틀 밖으로 잘리지 않게, 가장자리 근처에서는 붙는 쪽을 바꾼다.
                const edge = cluster.x < 110 ? 'left' : cluster.x > size.width - 110 ? 'right' : 'center';
                const below = cluster.y < 60;
                // 목록은 틀 안쪽으로 연다 — 틀이 `overflow-hidden`이라 위쪽 점에서 위로
                // 열면 잘린다(폰 한국 보기에서 서울 묶음이 그랬다).
                const listBelow = cluster.y < size.height / 2;
                const hit = Math.max(2 * cluster.r, 28);
                // 선택한 장소가 묶음 안에 있으면 라벨은 그 장소의 이름과 **그 장소의** 사진 수.
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
                        {/* 묶음 표시: 안쪽 크림 고리. 숫자를 넣기에는 작은 점이 많다. */}
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
                              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{place.count}</span>
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

      <p className="text-[12px] text-muted-foreground">
        점의 넓이는 사진 수에 비례합니다. 위치는 도시 단위의 대략입니다(약 11km). 겹친 점은 눌러서 펼치고, 장소를 누르면 그곳의 사진만 봅니다.
      </p>
    </div>
  );
}
