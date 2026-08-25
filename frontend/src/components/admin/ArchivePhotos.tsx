"use client";

import { useCallback, useEffect, useState } from 'react';
import PhotoUploadPanel from './PhotoUploadPanel';
import PhotoEditList from './PhotoEditList';
import { INPUT_CLASS } from './adminStyles';

/**
 * 아카이브 사진 관리. 앨범 하나를 골라 두고 그 아래에서 두 가지를 한다.
 *  - 위: 새 사진 업로드
 *  - 아래: 이미 올라간 사진의 제목/장소/연도 수정
 *
 * 앨범 선택을 이 컴포넌트가 쥐고 있는 이유는, 업로드 대기 중에 앨범이 바뀌면
 * 이미 Cloudinary의 이전 앨범 폴더로 올라간 파일과 저장될 `album_slug`가
 * 어긋나기 때문이다. 대기 중에는 선택을 잠근다.
 */

interface Album {
  id: number;
  title: string;
  slug: string;
}

export default function ArchivePhotos() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSlug, setAlbumSlug] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/albums');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setAlbums(data);
        setAlbumSlug(prev => prev || data[0]?.slug || '');
      } catch {
        // 앨범을 못 불러오면 선택지가 비고, 업로드 영역이 잠긴 채로 남는다.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaved = useCallback(() => setRefreshToken(n => n + 1), []);

  const albumTitle = albums.find(album => album.slug === albumSlug)?.title ?? '';

  return (
    <div className="mb-8 rounded-sm border border-border-light bg-canvas p-4 md:p-6 space-y-4">
      <div>
        <p className="eyebrow text-muted-foreground mb-1">Archive</p>
        <p className="font-serif text-base font-medium tracking-tight text-ink">사진 업로드 &amp; 정보 수정</p>
      </div>

      <div>
        <label htmlFor="photo-album" className="block label-ko text-muted-foreground mb-1.5">앨범</label>
        <select
          id="photo-album"
          className={`${INPUT_CLASS} md:max-w-xs`}
          value={albumSlug}
          onChange={e => setAlbumSlug(e.target.value)}
          disabled={pendingCount > 0 || albums.length === 0}
        >
          {albums.length === 0 && <option value="">앨범을 불러오는 중...</option>}
          {albums.map(album => (
            <option key={album.id} value={album.slug}>{album.title}</option>
          ))}
        </select>
        {pendingCount > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            올린 사진을 저장하거나 비우면 앨범을 바꿀 수 있습니다.
          </p>
        )}
      </div>

      <PhotoUploadPanel
        albumSlug={albumSlug}
        albumTitle={albumTitle}
        onPendingChange={setPendingCount}
        onSaved={handleSaved}
      />

      <PhotoEditList albumSlug={albumSlug} refreshToken={refreshToken} />
    </div>
  );
}
