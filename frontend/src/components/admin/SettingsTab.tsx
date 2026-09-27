"use client";

import { useEffect, useState } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { SectionHeader, StatusLine, type Message } from './AdminUi';
import PhotoPicker from './PhotoPicker';
import OrphanScan from './OrphanScan';
import MetadataFill from './MetadataFill';
import PlacesEditor from './PlacesEditor';
import { BTN_SM, INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 설정 — 홈 히어로, 사진 데이터(촬영 정보·장소 좌표), 그리고 Cloudinary 정리.
 *
 * 촬영 정보 채우기가 장소 좌표를 새로 넣으면 아래 좌표 목록이 다시 읽는다.
 */
export default function SettingsTab() {
  const [placesKey, setPlacesKey] = useState(0);
  return (
    <div className="space-y-10">
      <HeroSettings />
      <MetadataFill onPlacesAdded={() => setPlacesKey(k => k + 1)} />
      <PlacesEditor reloadKey={placesKey} />
      <OrphanScan />
    </div>
  );
}

function HeroSettings() {
  const [loaded, setLoaded] = useState(false);
  const [heroImage, setHeroImage] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [picking, setPicking] = useState(false);
  const [albums, setAlbums] = useState<Array<{ slug: string; title: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<Record<string, string>>('/api/admin/settings');
        if (cancelled) return;
        setHeroImage(data.hero_image || '');
        setHeroTitle(data.hero_title || '');
        setHeroSubtitle(data.hero_subtitle || '');
        setLoaded(true);
      } catch (e) {
        if (!cancelled) setMessage({ tone: 'error', text: errorMessage(e, '설정을 불러오지 못했습니다.') });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openPicker() {
    setPicking(v => !v);
    if (albums.length > 0) return;
    try {
      const data = await adminFetch<{ albums: Array<{ slug: string; title: string }> }>('/api/admin/albums');
      setAlbums(data.albums);
    } catch {
      // 앨범 필터 없이도 검색으로 고를 수 있다.
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await adminFetch('/api/admin/settings', 'PATCH', {
        hero_image: heroImage,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
      });
      setMessage({ tone: 'ok', text: '저장했습니다. 홈에 바로 반영됩니다.' });
    } catch (e) {
      // 히어로 주소는 서버가 호스트를 검증한다. "저장 실패"만 띄우면 무엇이
      // 잘못됐는지 알 수 없으므로 서버가 준 이유를 그대로 보여준다.
      setMessage({ tone: 'error', text: errorMessage(e, '저장에 실패했습니다.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      <SectionHeader
        eyebrow="홈 히어로"
        title="히어로 이미지 & 문구"
        actions={
          <button type="button" onClick={save} disabled={saving || !loaded} className={`btn-primary ${BTN_SM}`}>
            {saving ? '저장 중…' : '저장'}
          </button>
        }
      />
      <StatusLine message={message} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="hero-title" className={LABEL_CLASS}>타이틀</label>
          <input id="hero-title" className={INPUT_CLASS} value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Collecting the Greenery" />
        </div>
        <div>
          <label htmlFor="hero-subtitle" className={LABEL_CLASS}>서브타이틀</label>
          <input id="hero-subtitle" className={INPUT_CLASS} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="무심코 지나친 숲의 색깔…" />
        </div>
      </div>

      <div>
        <label htmlFor="hero-image" className={LABEL_CLASS}>이미지 URL (Cloudinary 또는 Unsplash)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="hero-image"
            className={`${INPUT_CLASS} font-mono text-[13px]`}
            value={heroImage}
            onChange={e => setHeroImage(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
          />
          <button type="button" onClick={() => void openPicker()} aria-expanded={picking} className={`btn-outline ${BTN_SM} shrink-0`}>
            {picking ? '닫기' : '아카이브에서 고르기'}
          </button>
        </div>
      </div>

      {picking && (
        <div className="rounded-lg border border-border bg-canvas p-3 md:p-4">
          <PhotoPicker
            albums={albums}
            selectedSrc={heroImage}
            onPick={photo => {
              setHeroImage(photo.src);
              setPicking(false);
              setMessage({ tone: 'ok', text: '이미지를 골랐습니다. 저장을 눌러야 홈에 반영됩니다.' });
            }}
          />
        </div>
      )}

      {heroImage && /^https:\/\/.+/.test(heroImage) && (
        <div>
          <p className="label-ko mb-2 text-muted-foreground">
            미리보기 <span className="text-[12px]">— 홈에서도 이 비율 그대로 실립니다</span>
          </p>
          {/* 고정 비율도 object-cover도 없다: 홈 히어로는 사진의 비율로 프레임을
              만들므로, 16:6 띠로 자른 미리보기는 홈이 하지 않는 크롭을 보여 준다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cloudinary(heroImage, { width: 800 })} alt="히어로 미리보기" className="block h-auto w-full max-w-md rounded-lg bg-surface" />
        </div>
      )}
    </section>
  );
}
