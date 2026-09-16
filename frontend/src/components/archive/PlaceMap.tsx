"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
// 빌드 때 번들에 들어간다 — 지도를 여는 순간 외부로 나가는 요청이 없다(CSP도
// 그대로). 110m 해상도(55 KB)라 제주·홋카이도 정도까지는 형태가 남는다.
import landTopology from 'world-atlas/land-110m.json';
import { availableRegions, dotRadius, inRegion, type MapPlace, type Region } from '@/lib/places';

/**
 * `/archive`의 "지도로 보기". 장소마다 점 하나, 크기는 사진 수.
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
 * 좌표는 소수점 한 자리(약 11km)다 — 점은 "이 근처"이지 촬영 위치가 아니다.
 */

const land = feature(
  landTopology as unknown as Topology<{ land: GeometryCollection }>,
  (landTopology as unknown as Topology<{ land: GeometryCollection }>).objects.land,
);

const SPHERE = { type: 'Sphere' } as const;

function projectionFor(region: Region, width: number, height: number): GeoProjection {
  const pad = Math.max(16, Math.min(width, height) * 0.08);
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

export default function PlaceMap({ places, selected, onSelect }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const regions = useMemo(() => availableRegions(places), [places]);
  const [regionId, setRegionId] = useState('world');
  const region = regions.find(r => r.id === regionId) ?? regions[0];

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(prev => (prev && prev.width === Math.round(width) && prev.height === Math.round(height)
        ? prev
        : { width: Math.round(width), height: Math.round(height) }));
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
    const dots = places
      .filter(place => inRegion(place, region))
      .map(place => {
        const point = projection([place.lng, place.lat]);
        if (!point) return null;
        const [x, y] = point;
        const r = dotRadius(place.count, max, { min: 5, maxRadius });
        if (x < -r || y < -r || x > size.width + r || y > size.height + r) return null;
        return { place, x, y, r };
      })
      .filter((dot): dot is NonNullable<typeof dot> => dot !== null);
    return {
      land: path(land) ?? '',
      sphere: region.bounds ? null : path(SPHERE),
      dots,
    };
  }, [size, region, places]);

  return (
    <div className="space-y-3">
      <div role="group" aria-label="지역" className="flex flex-wrap gap-2">
        {regions.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRegionId(r.id)}
            data-active={r.id === region.id}
            aria-pressed={r.id === region.id}
            className="btn-outline px-3.5 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {r.label}
          </button>
        ))}
      </div>

      <div
        ref={frameRef}
        id="archive-map"
        className="relative w-full overflow-hidden rounded-lg border border-border bg-surface aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1] max-h-[560px]"
      >
        {drawing && size && (
          <>
            <svg
              aria-hidden
              width={size.width}
              height={size.height}
              viewBox={`0 0 ${size.width} ${size.height}`}
              className="absolute inset-0"
            >
              {drawing.sphere && <path d={drawing.sphere} className="fill-canvas stroke-border" strokeWidth={1} />}
              <path d={drawing.land} className="fill-moss-wash stroke-forest/25" strokeWidth={0.75} strokeLinejoin="round" />
            </svg>

            <ul className="absolute inset-0 list-none" aria-label="사진을 찍은 장소">
              {drawing.dots.map(({ place, x, y, r }) => {
                const active = place.name === selected;
                // 라벨이 틀 밖으로 잘리지 않게, 가장자리 근처에서는 붙는 쪽을 바꾼다.
                const edge = x < 90 ? 'left' : x > size.width - 90 ? 'right' : 'center';
                const below = y < 44;
                return (
                  <li
                    key={place.name}
                    className="absolute"
                    style={{ left: x, top: y, zIndex: active ? 20 : 10 }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(place.name)}
                      aria-pressed={active}
                      aria-label={`${place.name}, 사진 ${place.count}장 — ${active ? '선택 해제' : '이 장소로 좁히기'}`}
                      className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none"
                      // 터치 대상은 점보다 크게: 보이는 원이 지름 10px이어도 누르는 자리는 32px.
                      style={{ width: Math.max(2 * r, 32), height: Math.max(2 * r, 32) }}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream transition-[transform,background-color,box-shadow] duration-200 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-1 ${
                          active ? 'bg-forest-deep ring-2 ring-moss' : 'bg-forest/85 group-hover:bg-forest'
                        }`}
                        style={{ width: 2 * r, height: 2 * r }}
                      />
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute whitespace-nowrap rounded-full bg-forest-black/90 px-2.5 py-1 text-[12px] font-medium leading-none text-cream shadow-xs transition-opacity duration-150 ${
                          below ? 'top-full mt-1' : 'bottom-full mb-1'
                        } ${
                          edge === 'left' ? 'left-0' : edge === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
                        } ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                      >
                        {place.name}
                        <span className="ml-1.5 tabular-nums text-cream/70">{place.count}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground">
        점의 넓이는 사진 수에 비례합니다. 위치는 도시 단위의 대략입니다(약 11km). 점을 누르면 그 장소의 사진만 봅니다.
      </p>
    </div>
  );
}
