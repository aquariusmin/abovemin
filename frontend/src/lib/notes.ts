import { suggestSlug } from './admin/slug';

export type Note = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags?: string[];
  /** 문단 배열. DB에는 빈 줄로 나눈 텍스트 하나로 있다. */
  body: string[];
  /** 이 글이 주장하지 **않는** 것. 필수다. */
  boundary: string;
  relatedProject?: string;
};

export interface NoteRow {
  id: number;
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[] | null;
  body: string;
  boundary: string;
  related_project: string | null;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

// DB의 check 제약과 같은 규칙. 주소에 영원히 남으므로 좁게 둔다.
export const NOTE_SLUG_RE = /^[a-z0-9-]{1,80}$/;

export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}

export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

export function suggestNoteSlug(title: string): string {
  return suggestSlug(title).slice(0, 80).replace(/-+$/g, '');
}

export function noteFromRow(row: Partial<NoteRow>): Note | null {
  if (!row.slug || !NOTE_SLUG_RE.test(row.slug)) return null;
  if (!row.title || !row.date || !row.summary || !row.boundary?.trim()) return null;
  const body = splitParagraphs(row.body ?? '');
  if (body.length === 0) return null;
  const tags = (row.tags ?? []).map(tag => tag.trim()).filter(Boolean);
  return {
    slug: row.slug,
    title: row.title,
    date: String(row.date).slice(0, 10),
    summary: row.summary,
    ...(tags.length ? { tags } : {}),
    body,
    boundary: row.boundary.trim(),
    ...(row.related_project ? { relatedProject: row.related_project } : {}),
  };
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
