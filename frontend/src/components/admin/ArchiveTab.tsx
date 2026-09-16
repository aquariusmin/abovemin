"use client";

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin/client';
import { useAdminNav } from './AdminApp';
import { SectionHeader } from './AdminUi';
import PhotoUploadPanel from './PhotoUploadPanel';
import PhotoManager, { type PhotoFilter } from './PhotoManager';
import LocationRename from './LocationRename';
import { INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 아카이브 사진 관리. 앨범 하나를 골라 두고 그 아래에서 세 가지를 한다.
 *  - 새 사진 업로드
 *  - 이미 올라간 사진의 정보·순서·숨김·일괄 작업
 *  - 장소 이름 바꾸기(앨범을 가로질러)
 *
 * 앨범 선택을 이 컴포넌트가 쥐고 있는 이유는, 업로드 대기 중에 앨범이 바뀌면
 * 이미 Cloudinary의 이전 앨범 폴더로 올라간 파일과 저장될 `album_slug`가
 * 어긋나기 때문이다. 대기 중에는 선택을 잠근다.
 */

export interface AlbumOption {
  id: number;
  title: string;
  slug: string;
  photo_count: number;
}

const FILTERS: PhotoFilter[] = ['all', 'untitled', 'nolocation', 'hidden'];

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

  // 개요의 "고치기"가 URL을 바꾸면 이미 열려 있는 이 탭도 따라가야 한다. 렌더 중
  // 비교로 맞춘다(effect에서 setState하면 한 번 옛 앨범으로 그렸다가 바뀐다).
  const [seenParams, setSeenParams] = useState(`${albumParam}|${filterParam}`);
  if (seenParams !== `${albumParam}|${filterParam}`) {
    setSeenParams(`${albumParam}|${filterParam}`);
    // 업로드 대기 중에는 앨범을 바꾸지 않는다(위 주석). 필터는 바꿔도 안전하다.
    if (albumParam && pendingCount === 0) setAlbumSlug(albumParam);
    setFilter(isFilter(filterParam) ? filterParam : 'all');
  }

  // 앨범 선택지(장수 포함). 업로드·이동·삭제 뒤에 `albumsKey`를 올려 다시 읽는다.
  const [albumsKey, setAlbumsKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ albums: AlbumOption[] }>('/api/admin/albums');
        if (cancelled) return;
        setAlbums(data.albums);
        setAlbumSlug(prev => prev || data.albums[0]?.slug || '');
      } catch {
        // 앨범을 못 불러오면 선택지가 비고, 업로드 영역이 잠긴 채로 남는다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumsKey]);

  const handleSaved = useCallback(() => {
    setRefreshToken(n => n + 1);
    setAlbumsKey(n => n + 1);
  }, []);

  // 사진 목록 쪽에서 바꾼 것(이동·삭제)은 목록이 스스로 다시 읽는다. 여기서는
  // 선택지의 장수만 맞춘다 — `handleSaved`를 쓰면 목록이 두 번 읽힌다.
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
