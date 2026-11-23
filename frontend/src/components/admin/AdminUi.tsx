"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ADMIN_STUDIO_MIGRATION } from '@/lib/admin/limits';
import { EYEBROW_CLASS, MESSAGE_CLASS, SECTION_TITLE_CLASS, BTN_SM } from './adminStyles';

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <p className={EYEBROW_CLASS}>{eyebrow}</p>
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {description && <p className="max-w-2xl text-sm text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface Message {
  tone: 'ok' | 'error';
  text: string;
}

/** 메시지가 없어도 요소를 남긴다 — `aria-live` 영역은 바뀌기 전부터 있어야 읽힌다. */
export function StatusLine({ message, className = '' }: { message: Message | null; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={message ? `${MESSAGE_CLASS[message.tone]} ${className}` : 'sr-only'}
    >
      {message?.text ?? ''}
    </p>
  );
}

export function MigrationNotice({ feature, file = ADMIN_STUDIO_MIGRATION }: { feature?: string; file?: string }) {
  return (
    <div role="note" className="rounded-lg border border-brick-soft bg-brick/[0.05] px-4 py-3 text-sm text-ink-body">
      <p className="font-medium text-brick">마이그레이션 적용 필요</p>
      <p className="mt-1 text-[13px] text-slate">
        {feature ? `${feature}은(는) ` : '일부 기능은 '}
        <code className="font-mono text-[12px]">{file}</code>을
        적용한 뒤에 동작합니다. 나머지 기능은 그대로 쓸 수 있습니다.
      </p>
    </div>
  );
}

export function LoadingLine({ label = '불러오는 중…' }: { label?: string }) {
  return <p className="label-ko animate-pulse py-8 text-center text-muted-foreground">{label}</p>;
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  tone?: 'destructive' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/** 기본 버튼은 "취소" — Enter 한 번에 되돌릴 수 없는 작업이 실행되면 안 된다. */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...options, resolve })),
    [],
  );

  const settle = useCallback(
    (confirmed: boolean) => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending],
  );

  const dialog = pending ? <ConfirmDialog options={pending} onSettle={settle} /> : null;
  return { confirm, dialog };
}

function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions; onSettle: (confirmed: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    // 열린 <dialog>를 언마운트하면 포커스가 <body>로 떨어진다 — 닫을 때 직접 돌려준다.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="admin-confirm-title"
      onCancel={event => {
        event.preventDefault();
        onSettle(false);
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-ink shadow-xl backdrop:bg-forest-black/40"
    >
      <div className="space-y-4 p-6">
        <h2 id="admin-confirm-title" className="font-serif text-xl font-medium tracking-tight">
          {options.title}
        </h2>
        {options.body && <div className="space-y-2 text-sm text-ink-body">{options.body}</div>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button ref={cancelRef} type="button" className={`btn-outline ${BTN_SM}`} onClick={() => onSettle(false)}>
            취소
          </button>
          <button
            type="button"
            className={`${options.tone === 'primary' ? 'btn-primary' : 'btn-destructive'} ${BTN_SM}`}
            onClick={() => onSettle(true)}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
