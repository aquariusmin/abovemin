"use client";

import { useState } from 'react';
import { INPUT_CLASS } from './adminStyles';

/** 관리자 비밀번호 입력. 시도 횟수 제한은 서버(`api/admin/auth`)가 한다. */
export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-3 text-center text-muted-foreground">phorage studio</p>
        {/* 이 화면의 유일한 최상위 제목 (axe: page-has-heading-one). */}
        <h1 className="mb-10 text-center font-serif text-3xl font-medium tracking-tight text-ink">Admin</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="sr-only">비밀번호</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="비밀번호"
              autoComplete="current-password"
              aria-invalid={error !== null}
              aria-describedby={error ? 'admin-password-error' : undefined}
              className={INPUT_CLASS}
              autoFocus
            />
          </div>
          {error && (
            <p id="admin-password-error" role="alert" className="text-[13px] text-brick">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '확인 중…' : '들어가기'}
          </button>
        </form>
      </div>
    </main>
  );
}
