"use client";

import { useEffect, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { EmptyLine, LoadingLine } from './AdminUi';
import { CHIP_KO, INPUT_COMPACT } from './adminStyles';

/**
 * 사진 고르기. 두 곳에서 쓴다.
 *  - 앨범 커버: 그 앨범의 사진만(`albumSlug`). 서버도 그 앨범 사진만 받는다.
 *  - 홈 히어로: 아카이브 전체에서 검색·앨범 필터로.
 *
 * URL을 붙여넣는 대신 고르게 하는 이유: 히어로에 오타 난 주소가 들어가면 홈이
 * 통째로 깨지고(`api/admin/settings` 주석), 커버에 남의 앨범 사진이 들어가는
 * 일이 실제로 있었다.
 */

export interface PickablePhoto {
  id: number;
  album_slug: string;
  src: string;
  title: string | null;
  location: string | null;
  year: number | null;
  hidden?: boolean;
}

interface Props {
  /** 주면 그 앨범만. 없으면 전체 + 앨범 필터. */
  albumSlug?: string;
  albums?: Array<{ slug: string; title: string }>;
  selectedSrc?: string | null;
  onPick: (photo: PickablePhoto) => void;
}

export default function PhotoPicker({ albumSlug, albums = [], selectedSrc, onPick }: Props) {
  const [photos, setPhotos] = useState<PickablePhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    const url = albumSlug
      ? `/api/admin/photos?album=${encodeURIComponent(albumSlug)}`
      : '/api/admin/photos?scope=all';
    (async () => {
      try {
        const data = await adminFetch<{ photos: PickablePhoto[] }>(url);
        if (!cancelled) setPhotos(data.photos);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e, '사진을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumSlug]);

  if (error) return <p role="alert" className="text-[13px] text-brick">{error}</p>;
  if (!photos) return <LoadingLine label="사진을 불러오는 중…" />;

  const needle = query.trim().toLowerCase();
  const titles = new Map(albums.map(album => [album.slug, album.title]));
  const shown = photos.filter(photo => {
    if (albumFilter && photo.album_slug !== albumFilter) return false;
    if (!needle) return true;
    return [photo.title, photo.location, String(photo.year ?? ''), titles.get(photo.album_slug) ?? photo.album_slug]
      .some(value => value?.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-3">
      {!albumSlug && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_14rem]">
          <input
            type="search"
            aria-label="사진 검색"
            placeholder="제목·장소·연도로 찾기"
            className={INPUT_COMPACT}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select aria-label="앨범으로 거르기" className={INPUT_COMPACT} value={albumFilter} onChange={e => setAlbumFilter(e.target.value)}>
            <option value="">모든 앨범</option>
            {albums.map(album => (
              <option key={album.slug} value={album.slug}>{album.title}</option>
            ))}
          </select>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyLine>{photos.length === 0 ? '고를 사진이 없습니다.' : '찾는 사진이 없습니다.'}</EmptyLine>
      ) : (
        <ul className="grid max-h-[28rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 md:grid-cols-6">
          {shown.map(photo => {
            const selected = selectedSrc === photo.src;
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => onPick(photo)}
                  aria-pressed={selected}
                  aria-label={`${photo.title || '제목 없음'}${photo.location ? ` · ${photo.location}` : ''} 고르기`}
                  className={`group relative block w-full overflow-hidden rounded-md bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                    selected ? 'ring-2 ring-forest' : ''
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinary(photo.src, { width: 240 })}
                    alt=""
                    loading="lazy"
                    className={`aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${photo.hidden ? 'opacity-40' : ''}`}
                  />
                  {photo.hidden && <span className={`badge-solid absolute left-1 top-1 px-2 ${CHIP_KO}`}>숨김</span>}
                  {selected && (
                    <span aria-hidden className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-[11px] text-primary-foreground">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[12px] text-muted-foreground">{shown.length}장</p>
    </div>
  );
}
