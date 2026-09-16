"use client";

import { useEffect, useState } from 'react';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { ARCHIVE_EXTRAS_MIGRATION } from '@/lib/admin/limits';
import { NOTE_SLUG_RE, parseTags, splitParagraphs, suggestNoteSlug, type NoteRow } from '@/lib/notes';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { BTN_SM, CHECKBOX_CLASS, CHIP_KO, FILTER_CHIP_CLASS, INPUT_CLASS, LABEL_CLASS, PANEL_CLASS } from './adminStyles';

/**
 * 노트 — 짧은 글을 쓰고, 고치고, 공개한다.
 *
 * 공개된 글이 한 편도 없으면 `/notes`는 404이고 푸터·RSS·sitemap 어디에도 나오지
 * 않는다. 첫 글을 공개하는 순간 전부 같이 살아난다(`lib/notes.ts` 머리 주석).
 * 새 글은 초안으로 시작한다.
 *
 * 본문은 마크다운이 아니라 **빈 줄로 나눈 문단**이다. 오른쪽 미리보기는 공개
 * 화면과 같은 함수(`splitParagraphs`)로 나눈다 — 여기서 세 문단이면 저기서도
 * 세 문단이다.
 */

type View = 'all' | 'published' | 'draft';

interface Draft {
  id: number | null;
  slug: string;
  /** 새 글에서 슬러그를 손으로 고쳤는가. 고치기 전까지는 제목을 따라간다. */
  slugTouched: boolean;
  title: string;
  date: string;
  summary: string;
  tags: string;
  body: string;
  boundary: string;
  related_project: string;
  published: boolean;
}

function today(): string {
  // 관리자는 한국에 있다. UTC 날짜를 쓰면 오전 9시 전에 쓴 글이 어제 날짜가 된다.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function emptyDraft(): Draft {
  return {
    id: null,
    slug: '',
    slugTouched: false,
    title: '',
    date: today(),
    summary: '',
    tags: '',
    body: '',
    boundary: '',
    related_project: '',
    published: false,
  };
}

function draftFrom(note: NoteRow): Draft {
  return {
    id: note.id,
    slug: note.slug,
    slugTouched: true,
    title: note.title,
    date: String(note.date).slice(0, 10),
    summary: note.summary,
    tags: (note.tags ?? []).join(', '),
    body: note.body,
    boundary: note.boundary,
    related_project: note.related_project ?? '',
    published: note.published,
  };
}

const STATUS_CHIP = {
  published: `chip ${CHIP_KO} border-forest/25 bg-moss-wash text-forest`,
  draft: `chip ${CHIP_KO} bg-muted text-muted-foreground`,
};

export default function NotesTab({ active }: { active: boolean }) {
  const [notes, setNotes] = useState<NoteRow[] | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<View>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ notes: NoteRow[]; migrationPending: boolean }>('/api/admin/notes');
        if (cancelled) return;
        setNotes(data.notes);
        setMigrationPending(data.migrationPending);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, '노트를 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, reloadKey]);

  if (loadError && !notes) return <p role="alert" className="py-8 text-center text-sm text-brick">{loadError}</p>;
  if (!notes) return <LoadingLine />;

  const publishedCount = notes.filter(note => note.published).length;
  const shown = notes.filter(note => view === 'all' || (view === 'published') === note.published);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="노트"
        title={`글 ${notes.length}편`}
        description={
          publishedCount === 0
            ? '공개된 글이 없어 /notes는 아직 잠들어 있습니다(404, 푸터·RSS·sitemap에도 없음). 첫 글을 공개하면 함께 나타납니다.'
            : `공개 ${publishedCount}편 — /notes, 푸터 링크, RSS, sitemap에 실립니다.`
        }
        actions={
          !migrationPending && !draft && (
            <button type="button" onClick={() => { setDraft(emptyDraft()); setMessage(null); }} className={`btn-primary ${BTN_SM}`}>
              새 글
            </button>
          )
        }
      />

      {migrationPending && <MigrationNotice feature="노트 쓰기" file={ARCHIVE_EXTRAS_MIGRATION} />}
      <StatusLine message={message} />

      {draft && (
        <NoteEditor
          // 다른 글을 열면 입력 상태를 새로 만든다.
          key={draft.id ?? 'new'}
          initial={draft}
          onClose={() => setDraft(null)}
          onSaved={(text, note) => {
            setMessage({ tone: 'ok', text });
            setDraft(note ? draftFrom(note) : null);
            setReloadKey(k => k + 1);
          }}
        />
      )}

      {!migrationPending && (
        notes.length === 0 ? (
          !draft && <EmptyLine>아직 쓴 글이 없습니다.</EmptyLine>
        ) : (
          <section className="space-y-3">
            <div role="group" aria-label="보기" className="flex flex-wrap gap-2">
              {([
                ['all', '전체', notes.length],
                ['published', '공개', publishedCount],
                ['draft', '초안', notes.length - publishedCount],
              ] as const).map(([id, label, count]) => (
                <button key={id} type="button" className={FILTER_CHIP_CLASS} data-active={view === id} aria-pressed={view === id} onClick={() => setView(id)}>
                  {label} <span className="tabular-nums">{count}</span>
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <EmptyLine>이 보기에 해당하는 글이 없습니다.</EmptyLine>
            ) : (
              <ul className={`${PANEL_CLASS} divide-y divide-border`}>
                {shown.map(note => {
                  const open = draft?.id === note.id;
                  return (
                    <li key={note.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className={note.published ? STATUS_CHIP.published : STATUS_CHIP.draft}>
                            {note.published ? '공개' : '초안'}
                          </span>
                          <span className="font-serif text-lg font-medium tracking-tight text-ink">{note.title}</span>
                        </p>
                        <p className="truncate text-[13px] text-slate">
                          <time dateTime={String(note.date)} className="tabular-nums">{String(note.date).replaceAll('-', '.')}</time>
                          {' · '}
                          <span className="font-mono text-[12px]">/notes/{note.slug}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => { setDraft(open ? null : draftFrom(note)); setMessage(null); }}
                        className={`btn-outline ${BTN_SM} w-fit shrink-0`}
                      >
                        {open ? '닫기' : '편집'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )
      )}
    </div>
  );
}

// ── 편집기 ────────────────────────────────────────────────────────────────────

function NoteEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Draft;
  onClose: () => void;
  onSaved: (text: string, note: NoteRow | null) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();
  const isNew = draft.id === null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));

  const slugValid = NOTE_SLUG_RE.test(draft.slug);
  const boundaryMissing = draft.boundary.trim() === '';
  const paragraphs = splitParagraphs(draft.body);
  const tags = parseTags(draft.tags);

  async function save() {
    if (!slugValid) {
      setError({ tone: 'error', text: '슬러그는 영문 소문자·숫자·하이픈 1~80자여야 합니다.' });
      return;
    }
    if (boundaryMissing) {
      setError({ tone: 'error', text: '해석 범위(이 글이 주장하지 않는 것)는 비워 둘 수 없습니다.' });
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      slug: draft.slug,
      title: draft.title,
      date: draft.date,
      summary: draft.summary,
      tags,
      body: draft.body,
      boundary: draft.boundary,
      related_project: draft.related_project.trim() || null,
      published: draft.published,
    };
    try {
      const result = isNew
        ? await adminFetch<{ note: NoteRow }>('/api/admin/notes', 'POST', body)
        : await adminFetch<{ note: NoteRow }>('/api/admin/notes', 'PATCH', { id: draft.id, ...body });
      const state = result.note.published ? '공개했습니다' : '초안으로 저장했습니다';
      onSaved(`“${result.note.title}”을(를) ${state}.`, result.note);
    } catch (e) {
      setError({ tone: 'error', text: errorMessage(e, '저장하지 못했습니다.') });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (draft.id === null) return;
    const ok = await confirm({
      title: `“${initial.title}”을(를) 지울까요?`,
      body: (
        <p>
          {initial.published
            ? `공개된 글입니다. /notes/${initial.slug} 주소는 더 이상 열리지 않습니다.`
            : '초안입니다. 되돌릴 수 없습니다.'}
        </p>
      ),
      confirmLabel: '글 지우기',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await adminFetch('/api/admin/notes', 'DELETE', { id: draft.id });
      onSaved(`“${initial.title}”을(를) 지웠습니다.`, null);
    } catch (e) {
      setError({ tone: 'error', text: errorMessage(e, '지우지 못했습니다.') });
      setBusy(false);
    }
  }

  return (
    <section className={`${PANEL_CLASS} p-5 md:p-6`} aria-label={isNew ? '새 글' : `${initial.title} 편집`}>
      {dialog}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void save();
          }}
        >
          <h2 className="font-serif text-xl font-medium tracking-tight text-ink">{isNew ? '새 글' : '글 편집'}</h2>

          <div>
            <label htmlFor="note-title" className={LABEL_CLASS}>제목</label>
            <input
              id="note-title"
              className={INPUT_CLASS}
              value={draft.title}
              required
              onChange={event => {
                const title = event.target.value;
                setDraft(prev => ({ ...prev, title, slug: prev.slugTouched ? prev.slug : suggestNoteSlug(title) }));
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div>
              <label htmlFor="note-slug" className={LABEL_CLASS}>슬러그</label>
              <input
                id="note-slug"
                className={`${INPUT_CLASS} font-mono text-[13px]`}
                value={draft.slug}
                required
                aria-invalid={draft.slug !== '' && !slugValid}
                aria-describedby="note-slug-hint"
                placeholder="night-lights-and-gdp"
                onChange={event => setDraft(prev => ({ ...prev, slug: event.target.value, slugTouched: true }))}
              />
              <p id="note-slug-hint" className="mt-1.5 text-[12px] text-slate">
                영문 소문자·숫자·하이픈. 주소가 됩니다: <span className="font-mono">/notes/{draft.slug || '…'}</span>
                {isNew && !draft.slug && ' — 한글 제목은 제안하지 않으니 직접 적어 주세요.'}
                {!isNew && ' 공개된 글의 슬러그를 바꾸면 옛 주소는 404가 됩니다.'}
              </p>
            </div>
            <div>
              <label htmlFor="note-date" className={LABEL_CLASS}>날짜</label>
              <input id="note-date" type="date" className={INPUT_CLASS} value={draft.date} required onChange={event => set('date', event.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="note-summary" className={LABEL_CLASS}>요약</label>
            <textarea id="note-summary" rows={2} className={INPUT_CLASS} value={draft.summary} required onChange={event => set('summary', event.target.value)} />
            <p className="mt-1.5 text-[12px] text-slate">한 문단. 목록과 RSS에 그대로 쓰입니다.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="note-tags" className={LABEL_CLASS}>태그</label>
              <input id="note-tags" className={INPUT_CLASS} value={draft.tags} placeholder="대체데이터, 회귀" onChange={event => set('tags', event.target.value)} />
              <p className="mt-1.5 text-[12px] text-slate">쉼표로 나눕니다.</p>
            </div>
            <div>
              <label htmlFor="note-related" className={LABEL_CLASS}>관련 프로젝트 (선택)</label>
              <input
                id="note-related"
                className={`${INPUT_CLASS} font-mono text-[13px]`}
                value={draft.related_project}
                placeholder="satellite-gdp-insight"
                onChange={event => set('related_project', event.target.value)}
              />
              <p className="mt-1.5 text-[12px] text-slate">포트폴리오 슬러그. 글 끝에 링크가 붙습니다.</p>
            </div>
          </div>

          <div>
            <label htmlFor="note-body" className={LABEL_CLASS}>본문</label>
            <textarea
              id="note-body"
              rows={14}
              className={`${INPUT_CLASS} leading-relaxed`}
              value={draft.body}
              required
              onChange={event => set('body', event.target.value)}
            />
            <p className="mt-1.5 text-[12px] text-slate">
              빈 줄로 문단을 나눕니다(지금 {paragraphs.length}문단). 마크다운은 쓰지 않습니다 — 글이 몇 편일 때 파서가 글보다 무겁습니다.
            </p>
          </div>

          <div>
            <label htmlFor="note-boundary" className={LABEL_CLASS}>해석 범위 — 이 글이 주장하지 않는 것</label>
            <textarea
              id="note-boundary"
              rows={3}
              className={INPUT_CLASS}
              value={draft.boundary}
              required
              aria-invalid={boundaryMissing && draft.body.trim() !== ''}
              aria-describedby="note-boundary-hint"
              onChange={event => set('boundary', event.target.value)}
            />
            <p id="note-boundary-hint" className="mt-1.5 text-[12px] text-slate">
              필수입니다. 노트는 공개 데이터를 짧게 들여다보고 무엇을 말할 수 있고 무엇은 말할 수 없는지 적는 글이라,
              이 줄이 글의 목적입니다. 본문 끝에 케이스 스터디의 해석 범위와 같은 무게로 실립니다.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-body">
            <input type="checkbox" className={CHECKBOX_CLASS} checked={draft.published} onChange={event => set('published', event.target.checked)} />
            공개 <span className="text-[12px] text-slate">— 끄면 초안으로 남고 어디에도 나오지 않습니다.</span>
          </label>

          <StatusLine message={error} />

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button type="submit" disabled={busy} className={`btn-primary ${BTN_SM}`}>
              {busy ? '저장 중…' : isNew ? (draft.published ? '공개하기' : '초안 저장') : '저장'}
            </button>
            <button type="button" onClick={onClose} disabled={busy} className={`btn-outline ${BTN_SM}`}>
              닫기
            </button>
            {!isNew && (
              <button type="button" onClick={() => void remove()} disabled={busy} className={`btn-destructive ${BTN_SM} ml-auto`}>
                지우기
              </button>
            )}
          </div>
        </form>

        {/* 미리보기 — 공개 글 페이지(`app/notes/[slug]`)와 같은 구성과 글씨를 한
            단계 작게. */}
        <div aria-label="미리보기" className="min-w-0 space-y-4 rounded-lg border border-border bg-canvas p-5 md:p-6 lg:sticky lg:top-24 lg:self-start">
          <p className="label-ko text-muted-foreground">미리보기</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="eyebrow text-muted-foreground">{draft.date.replaceAll('-', '.')}</span>
            {tags.map(tag => (
              <span key={tag} className="eyebrow text-primary">{tag}</span>
            ))}
          </div>
          <h3 className="font-serif text-2xl font-medium leading-tight tracking-tight text-ink">
            {draft.title || <span className="text-muted-foreground">제목</span>}
          </h3>
          {draft.summary && <p className="text-sm leading-relaxed text-slate">{draft.summary}</p>}
          <div className="space-y-4 border-t border-hairline pt-4">
            {paragraphs.length === 0 ? (
              <p className="text-sm text-muted-foreground">본문을 쓰면 문단이 여기에 나뉘어 보입니다.</p>
            ) : (
              paragraphs.map((paragraph, i) => (
                <p key={i} className="text-sm leading-[1.85] text-ink-body">{paragraph}</p>
              ))
            )}
          </div>
          <aside className={`border-l-4 px-4 py-4 ${boundaryMissing ? 'border-brick-soft bg-brick/[0.04]' : 'border-accent bg-surface'}`}>
            <p className="eyebrow mb-2 text-muted-foreground">해석 범위</p>
            <p className={`text-sm leading-relaxed ${boundaryMissing ? 'text-brick' : 'text-ink-body'}`}>
              {boundaryMissing ? '비어 있습니다 — 저장할 수 없습니다.' : draft.boundary}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
