"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EYEBROW_CLASS, MESSAGE_CLASS, SECTION_TITLE_CLASS, BTN_SM } from './adminStyles';

/**
 * 관리 화면 곳곳에서 되풀이되는 작은 조각들: 섹션 머리, 상태 메시지,
 * "마이그레이션 적용 필요" 안내, 확인 대화상자.
 */

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

/**
 * 결과 한 줄. 메시지가 없어도 요소는 남겨 둔다 — `aria-live` 영역은 내용이
 * 바뀌기 **전부터** 문서에 있어야 스크린리더가 변화를 읽는다.
 */
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

/**
 * 새 컬럼을 쓰는 기능이 아직 DB에 없을 때. 화면을 막지 않고, 무엇이 안 되는지와
 * 무엇을 하면 되는지를 적는다.
 */
export function MigrationNotice({ feature }: { feature?: string }) {
  return (
    <div role="note" className="rounded-lg border border-brick-soft bg-brick/[0.05] px-4 py-3 text-sm text-ink-body">
      <p className="font-medium text-brick">마이그레이션 적용 필요</p>
      <p className="mt-1 text-[13px] text-slate">
        {feature ? `${feature}은(는) ` : '일부 기능은 '}
        <code className="font-mono text-[12px]">supabase/migrations/20260916000000_admin_studio.sql</code>을
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

// ── 확인 대화상자 ─────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  tone?: 'destructive' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * `window.confirm` 대신 쓰는 모달. 되돌릴 수 없는 작업(삭제, 원본 파기)에서
 * 무엇이 몇 개·몇 MB 사라지는지를 **읽을 수 있게** 보여 주려면 줄글 한 줄로는
 * 모자라다.
 *
 * `<dialog>` + `showModal()`: 포커스 가두기, Esc 닫기, 배경 비활성화를
 * 브라우저가 해 준다. 기본 버튼은 "취소"에 둔다 — Enter 한 번에 지워지면 안 된다.
 *
 * 쓰는 법: `const { confirm, dialog } = useConfirm();` → `if (await confirm({...}))`,
 * 그리고 `{dialog}`를 렌더한다.
 */
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
    dialog.showModal();
    cancelRef.current?.focus();
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
