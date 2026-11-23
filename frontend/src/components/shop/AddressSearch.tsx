import { useEffect, useEffectEvent, useRef, useState } from 'react';

// "use client"를 적지 않는다: 함수 prop(`onSelect`)을 받는 컴포넌트는 서버 경계가 될 수 없다.

/** 카카오 우편번호(키 없음). 처음 누를 때만 스크립트를 받고, 실패해도 주소는 직접 적는다. CSP는 `next.config.ts`. */
const SCRIPT_SRC = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

interface PostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
  bname: string;
  buildingName: string;
  apartment: 'Y' | 'N';
}

interface PostcodeInstance {
  embed: (element: HTMLElement, options?: { autoClose?: boolean }) => void;
}

declare global {
  interface Window {
    kakao?: { Postcode?: new (options: Record<string, unknown>) => PostcodeInstance };
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.kakao?.Postcode) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    // onload 시점에 `kakao.Postcode`가 비어 있을 수 있어 `kakao.Postcode.load`가 있으면 기다린다.
    script.onload = () => {
      const postcode = window.kakao?.Postcode as unknown as { load?: (cb: () => void) => void } | undefined;
      if (postcode?.load) postcode.load(() => resolve());
      else if (window.kakao?.Postcode) resolve();
      else reject(new Error('postcode unavailable'));
    };
    script.onerror = () => reject(new Error('postcode script failed'));
    document.head.appendChild(script);
  }).catch(error => {
    loading = null; // 다음에 누를 때 다시 시도한다.
    throw error;
  });
  return loading;
}

function formatAddress(data: PostcodeData): string {
  if (data.userSelectedType === 'J') return data.jibunAddress;
  const extras: string[] = [];
  if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
  if (data.buildingName && data.apartment === 'Y') extras.push(data.buildingName);
  return extras.length ? `${data.roadAddress} (${extras.join(', ')})` : data.roadAddress;
}

export default function AddressSearch({
  onSelect,
}: {
  onSelect: (result: { zipcode: string; address: string }) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  // 검색 화면이 열린 동안 부모가 다시 그려져도 화면을 새로 심지 않게.
  const select = useEffectEvent((data: PostcodeData) => {
    onSelect({ zipcode: data.zonecode, address: formatAddress(data) });
    dialogRef.current?.close();
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        const Postcode = window.kakao?.Postcode;
        const frame = frameRef.current;
        if (cancelled || !Postcode || !frame) return;
        frame.replaceChildren();
        new Postcode({
          oncomplete: (data: PostcodeData) => select(data),
          width: '100%',
          height: '100%',
        }).embed(frame, { autoClose: false });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function show() {
    setFailed(false);
    dialogRef.current?.showModal();
    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={show} className="btn-outline shrink-0 min-h-11">
        주소 찾기
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="address-search-title"
        onClose={() => setOpen(false)}
        onClick={event => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(calc(100vw-2rem),32rem)] rounded-lg border border-border-light bg-canvas p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 id="address-search-title" className="text-[15px] font-medium">주소 찾기</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="닫기"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>
        {failed ? (
          <p role="alert" className="px-4 py-10 text-center text-sm text-brick break-keep">
            주소 검색을 불러오지 못했습니다. 주소 칸에 직접 적어 주세요.
          </p>
        ) : (
          <div ref={frameRef} className="h-[min(70svh,30rem)]" />
        )}
      </dialog>
    </>
  );
}
