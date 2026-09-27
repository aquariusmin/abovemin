"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BTN_SM, INPUT_CLASS } from './adminStyles';

/** 관리자 비밀번호 입력. 시도 횟수 제한은 서버(`api/admin/auth`)가 한다. */
export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-3 text-center text-muted-foreground">phorage studio</p>
        {/* 이 화면의 유일한 최상위 제목 (axe: page-has-heading-one). */}
        <h1 className="mb-10 text-center font-serif text-3xl font-medium tracking-tight text-ink">Admin</h1>
        <LoginForm onSuccess={onSuccess} />
        {/* /admin에는 사이트 내비게이션이 없다(`lib/chrome.ts`). */}
        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate underline-offset-4 hover:underline">
            ← 사이트로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}

/**
 * 쓰는 도중 세션이 끝났을 때(세션은 8시간) 대시보드 **위에** 띄우는 로그인.
 *
 * 로그인 화면으로 갈아 끼우면 대시보드가 언마운트되면서 쓰던 노트·상품 초안,
 * 올려 둔 사진 대기 목록이 전부 사라진다. 여기서는 아래 화면을 그대로 두고,
 * 다시 들어오면 방금 실패한 저장을 한 번 더 누르면 된다.
 *
 * "나중에"로 닫을 수 있다 — 초안을 다른 곳에 옮겨 적을 수 있게. 다음 요청이
 * 또 401을 받으면 다시 열린다.
 */
export function SessionExpiredDialog({ onSuccess, onDismiss }: { onSuccess: () => void; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    // 확인 대화상자(`AdminUi`)와 같이, 닫힐 때 포커스를 원래 자리(대개 방금 누른
    // 저장 버튼)로 돌려준다.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="admin-relogin-title"
      aria-describedby="admin-relogin-body"
      onCancel={event => {
        event.preventDefault();
        onDismiss();
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-ink shadow-xl backdrop:bg-forest-black/40"
    >
      <div className="space-y-4 p-6">
        <h2 id="admin-relogin-title" className="font-serif text-xl font-medium tracking-tight">
          로그인이 만료되었습니다
        </h2>
        <p id="admin-relogin-body" className="text-sm text-ink-body">
          작성 중인 내용은 그대로 있습니다. 다시 로그인한 뒤 저장을 한 번 더 눌러 주세요.
        </p>
        <LoginForm onSuccess={onSuccess} idPrefix="admin-relogin" />
        <div className="flex justify-end">
          <button type="button" onClick={onDismiss} className={`btn-ghost ${BTN_SM} text-slate`}>
            나중에
          </button>
        </div>
      </div>
    </dialog>
  );
}

function LoginForm({ onSuccess, idPrefix = 'admin' }: { onSuccess: () => void; idPrefix?: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setError(null);
        onSuccess();
      } else {
        setError(res.status === 429 ? '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' : '비밀번호가 틀렸습니다.');
      }
    } catch {
      setError('네트워크 오류로 로그인하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const inputId = `${idPrefix}-password`;
  const errorId = `${idPrefix}-password-error`;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={inputId} className="sr-only">비밀번호</label>
        <input
          id={inputId}
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="비밀번호"
          autoComplete="current-password"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={INPUT_CLASS}
          autoFocus
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-brick">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? '확인 중…' : '들어가기'}
      </button>
    </form>
  );
}
