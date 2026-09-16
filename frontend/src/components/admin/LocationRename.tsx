"use client";

import { useCallback, useEffect, useState } from 'react';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import type { LocationCount, LocationVariantGroup } from '@/lib/admin/data-checks';
import { SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { BTN_SM, INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 장소 이름 바꾸기 — 앨범을 가로질러 한 표기를 통째로 바꾼다.
 *
 * 아카이브의 장소 필터는 문자열이 같아야 한 곳으로 묶는다. "서울" 58장과
 * "Seoul" 1장은 공개 화면에서 두 개의 장소 칩이 된다. 사진을 한 장씩 찾아
 * 고치는 대신 여기서 한 번에 바꾼다.
 *
 * 바꾸기 전에 반드시 서버에 몇 장인지 물어본다(dry run). 목록의 숫자는 화면을
 * 연 시점의 것이라, 그 사이 다른 탭에서 고친 것이 반영되지 않았을 수 있다.
 */

interface Props {
  initialFrom: string;
  initialTo: string;
  onRenamed: () => void;
}

export default function LocationRename({ initialFrom, initialTo, onRenamed }: Props) {
  const [locations, setLocations] = useState<LocationCount[]>([]);
  const [variants, setVariants] = useState<LocationVariantGroup[]>([]);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [preview, setPreview] = useState<{ from: string; count: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ locations: LocationCount[]; variants: LocationVariantGroup[] }>(
        '/api/admin/photos/locations',
      );
      setLocations(data.locations);
      setVariants(data.variants);
    } catch {
      // 목록이 없어도 직접 입력해서 쓸 수 있다.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run() {
    if (from === to) {
      setMessage({ tone: 'error', text: '바꿀 이름이 지금과 같습니다.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const dry = await adminFetch<{ count: number }>('/api/admin/photos/locations', 'POST', { from, to, dry_run: true });
      setPreview({ from, count: dry.count });
      if (dry.count === 0) {
        setMessage({ tone: 'error', text: `“${from}”로 저장된 사진이 없습니다. 공백까지 똑같아야 합니다.` });
        return;
      }
      const ok = await confirm({
        title: `장소 ${dry.count}장을 바꿀까요?`,
        body: (
          <p>
            &ldquo;<strong className="font-medium">{from || '(빈칸)'}</strong>&rdquo; →{' '}
            &ldquo;<strong className="font-medium">{to.trim() || '(빈칸)'}</strong>&rdquo; — 모든 앨범에서 바뀝니다.
          </p>
        ),
        confirmLabel: `${dry.count}장 바꾸기`,
        tone: 'primary',
      });
      if (!ok) return;
      const result = await adminFetch<{ count: number }>('/api/admin/photos/locations', 'POST', { from, to });
      setMessage({ tone: 'ok', text: `${result.count}장의 장소를 “${to.trim()}”로 바꿨습니다.` });
      setPreview(null);
      setFrom('');
      await load();
      onRenamed();
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, '바꾸지 못했습니다.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${PANEL_CLASS} space-y-5 p-5 md:p-6`}>
      {dialog}
      <SectionHeader
        eyebrow="장소 표기"
        title="장소 이름 바꾸기"
        description="같은 곳이 여러 표기로 나뉘어 있으면 공개 화면의 장소 필터도 나뉩니다. 한 표기를 모든 앨범에서 한 번에 바꿉니다."
      />

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="label-ko text-muted-foreground">겹쳐 보이는 표기</p>
          <ul className="flex flex-wrap gap-2">
            {variants.flatMap(group => {
              const [main, ...others] = group.variants;
              return others.map(other => (
                <li key={`${group.key}-${other.value}`}>
                  <button
                    type="button"
                    onClick={() => { setFrom(other.value); setTo(main.value); setPreview(null); setMessage(null); }}
                    className={`btn-outline ${BTN_SM}`}
                  >
                    &ldquo;{other.value}&rdquo; {other.count} → &ldquo;{main.value}&rdquo; {main.count}
                  </button>
                </li>
              ));
            })}
          </ul>
        </div>
      )}

      <form
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={e => { e.preventDefault(); void run(); }}
      >
        <div>
          <label htmlFor="rename-from" className={LABEL_CLASS}>지금 표기</label>
          <input
            id="rename-from"
            list="rename-from-options"
            className={INPUT_CLASS}
            value={from}
            onChange={e => { setFrom(e.target.value); setPreview(null); }}
            placeholder="Seoul"
          />
          <datalist id="rename-from-options">
            {locations.map(location => (
              <option key={location.value} value={location.value}>{`${location.count}장`}</option>
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="rename-to" className={LABEL_CLASS}>바꿀 표기</label>
          <input
            id="rename-to"
            className={INPUT_CLASS}
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="서울"
          />
        </div>
        <button type="submit" disabled={busy || from === to} className="btn-outline">
          {busy ? '확인 중…' : '미리 보고 바꾸기'}
        </button>
      </form>

      {preview && preview.from === from && preview.count > 0 && (
        <p className="text-[13px] text-slate">&ldquo;{preview.from}&rdquo; — {preview.count}장</p>
      )}
      <StatusLine message={message} />
    </section>
  );
}
