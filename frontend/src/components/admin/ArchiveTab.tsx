"use client";

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin/client';
import { useAdminNav } from './AdminApp';
import { SectionHeader } from './AdminUi';
import PhotoUploadPanel from './PhotoUploadPanel';
import PhotoManager, { type PhotoFilter } from './PhotoManager';
import LocationRename from './LocationRename';
import { INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';
import { useRetryAfterRelogin } from './SessionRetry';

/** 업로드 대기 중에는 앨범 선택을 잠근다 — 이미 올라간 Cloudinary 폴더와 `album_slug`가 어긋난다. */

export interface AlbumOption {
  id: number;
  title: string;
  slug: string;
  photo_count: number;
}

const FILTERS: PhotoFilter[] = ['all', 'untitled', 'nolocation', 'hidden', 'yearmismatch', 'lowres', 'noexif', 'gps'];

function isFilter(value: string | null): value is PhotoFilter {
  return FILTERS.includes(value as PhotoFilter);
}

export default function ArchiveTab() {
  const { params } = useAdminNav();
  const albumParam = params.get('album');
  const filterParam = params.get('filter');
  const renameParam = params.get('rename');
  const renameToParam = params.get('to');

  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [albumSlug, setAlbumSlug] = useState(albumParam ?? '');
  const [filter, setFilter] = useState<PhotoFilter>(isFilter(filterParam) ? filterParam : 'all');
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  // 렌더 중 비교로 URL을 따른다 — effect에서 setState하면 옛 앨범으로 한 번 그린다.
  const [seenParams, setSeenParams] = useState(`${albumParam}|${filterParam}`);
  if (seenParams !== `${albumParam}|${filterParam}`) {
    setSeenParams(`${albumParam}|${filterParam}`);
    // 업로드 대기 중에는 앨범을 바꾸지 않는다. 필터는 바꿔도 안전하다.
    if (albumParam && pendingCount === 0) setAlbumSlug(albumParam);
    setFilter(isFilter(filterParam) ? filterParam : 'all');
  }

  const [albumsKey, setAlbumsKey] = useState(0);
  const [albumsFailed, setAlbumsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ albums: AlbumOption[] }>('/api/admin/albums');
        if (cancelled) return;
        setAlbums(data.albums);
        setAlbumSlug(prev => prev || data.albums[0]?.slug || '');
        setAlbumsFailed(false);
      } catch {
        if (!cancelled) setAlbumsFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumsKey]);

  useRetryAfterRelogin(albumsFailed, () => setAlbumsKey(n => n + 1));

  const handleSaved = useCallback(() => {
    setRefreshToken(n => n + 1);
    setAlbumsKey(n => n + 1);
  }, []);

  // 선택지 장수만 맞춘다 — `handleSaved`를 쓰면 목록이 두 번 읽힌다.
  const refreshAlbums = useCallback(() => setAlbumsKey(n => n + 1), []);

  const album = albums.find(item => item.slug === albumSlug);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="아카이브"
        title="사진 업로드 & 정리"
        description="앨범을 고르고 사진을 올리거나, 이미 올라간 사진의 정보·순서·공개 여부를 한 번에 고칩니다."
      />

      <div className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
        <div className="max-w-sm">
          <label htmlFor="photo-album" className={LABEL_CLASS}>앨범</label>
          <select
            id="photo-album"
            className={INPUT_CLASS}
            value={albumSlug}
            onChange={e => setAlbumSlug(e.target.value)}
            disabled={pendingCount > 0 || albums.length === 0}
          >
            {albums.length === 0 && <option value="">앨범을 불러오는 중…</option>}
            {albums.map(item => (
              <option key={item.id} value={item.slug}>
                {item.title} ({item.photo_count})
              </option>
            ))}
          </select>
          {pendingCount > 0 && (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              올린 사진을 저장하거나 비우면 앨범을 바꿀 수 있습니다.
            </p>
          )}
        </div>

        <PhotoUploadPanel
          albumSlug={albumSlug}
          albumTitle={album?.title ?? ''}
          onPendingChange={setPendingCount}
          onSaved={handleSaved}
        />
      </div>

      <PhotoManager
        albumSlug={albumSlug}
        albums={albums}
        filter={filter}
        onFilterChange={setFilter}
        refreshToken={refreshToken}
        onChanged={refreshAlbums}
      />

      <LocationRename
        key={`${renameParam}|${renameToParam}`}
        initialFrom={renameParam ?? ''}
        initialTo={renameToParam ?? ''}
        onRenamed={handleSaved}
      />
    </div>
  );
}
