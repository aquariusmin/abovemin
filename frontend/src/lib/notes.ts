/**
 * 짧은 글.
 *
 * 이 사이트의 포트폴리오가 가진 힘은 프로젝트 목록이 아니라 **말할 수 있는
 * 범위를 먼저 긋는 태도**다 — "해석 범위", "이렇게 주장하지 않습니다", R²를
 * 설명력으로만 쓰는 것. 지금 그 태도는 케이스 스터디 안에서만 보인다.
 * 공개 데이터를 짧게 들여다보고 무엇을 말할 수 있고 무엇은 말할 수 없는지
 * 적는 글이 쌓이면, 그게 사이트의 앞면으로 나온다.
 *
 * 형식은 케이스 스터디를 따르지 않는다. 케이스 스터디는 완결된 작업이고
 * 이건 생각의 조각이라, 강제하는 필드가 적다. 다만 `boundary`만은 선택이
 * 아니다 — 이 글들이 존재하는 이유가 거기에 있기 때문이다.
 *
 * ── 글은 DB에 있다 ──────────────────────────────────────────────────────
 * 예전에는 `src/data/notes.ts`의 배열이었고, 글 하나를 올리려면 배포가
 * 필요했다. 이제 `/admin` → 노트 탭에서 쓰고 `published`를 켠다
 * (`notes` 테이블, 마이그레이션 20260916100000). 공개된 글이 한 편이라도 생기는
 * 순간 `/notes`가 살아나고 푸터 링크와 RSS와 sitemap이 따라 붙는다. 없는 동안에는
 * 어디에도 나타나지 않는다 — 빈 목록 페이지를 링크해 두는 것보다 없는 편이 낫다.
 *
 * 이 파일은 **순수**하다(DB 조회는 `lib/supabase.ts`). 공개 화면·관리 화면·
 * 테스트가 같은 규칙으로 행을 글로 바꾼다.
 */
import { suggestSlug } from './admin/slug';

export type Note = {
  slug: string;
  title: string;
  /** `YYYY-MM-DD`. 목록 정렬과 `<time>`에 쓰인다. */
  date: string;
  summary: string;
  tags?: string[];
  /** 문단 배열. 한 항목이 한 `<p>`. DB에는 빈 줄로 나눈 텍스트 하나로 있다. */
  body: string[];
  /** 이 글이 주장하지 **않는** 것. 필수다. */
  boundary: string;
  /** 관련 케이스 스터디가 있으면 그 slug. */
  relatedProject?: string;
};

/** `notes` 테이블의 한 행. 관리 화면이 그대로 받는다. */
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

/** DB의 check 제약과 같은 규칙. 주소에 영원히 남으므로 좁게 둔다. */
export const NOTE_SLUG_RE = /^[a-z0-9-]{1,80}$/;

/**
 * 본문 텍스트 → 문단. 빈 줄(공백만 있는 줄 포함) 하나 이상이 문단 경계다.
 * 문단 안의 줄바꿈은 그대로 둔다 — `<p>` 안에서는 공백으로 보인다.
 *
 * 마크다운 파서를 두지 않은 이유는 예전 그대로다: 글이 다섯 편일 때 파서가
 * 글보다 무겁다.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}

/** "대체데이터, 회귀 ,, 회귀" → ["대체데이터", "회귀"]. 순서는 적은 대로. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/**
 * 제목 → 슬러그 제안. 앨범과 같은 규칙(`admin/slug.ts`)이다 — 한글은 로마자로
 * 옮기지 않고, 남는 것이 없으면 빈 문자열이라 직접 적게 한다. 날짜를 앞에
 * 붙이지 않는 이유: 글 주소는 목록의 순서가 아니라 글의 이름이다.
 */
export function suggestNoteSlug(title: string): string {
  return suggestSlug(title).slice(0, 80).replace(/-+$/g, '');
}

/** DB 행 → 공개 화면의 글. 필수 값이 비어 있으면(손으로 넣은 행) 버린다. */
export function noteFromRow(row: Partial<NoteRow>): Note | null {
  if (!row.slug || !NOTE_SLUG_RE.test(row.slug)) return null;
  if (!row.title || !row.date || !row.summary || !row.boundary?.trim()) return null;
  const body = splitParagraphs(row.body ?? '');
  if (body.length === 0) return null;
  const tags = (row.tags ?? []).map(tag => tag.trim()).filter(Boolean);
  return {
    slug: row.slug,
    title: row.title,
    // `date` 컬럼은 `YYYY-MM-DD`로 온다. 혹시 시각이 붙어 와도 날짜만.
    date: String(row.date).slice(0, 10),
    summary: row.summary,
    ...(tags.length ? { tags } : {}),
    body,
    boundary: row.boundary.trim(),
    ...(row.related_project ? { relatedProject: row.related_project } : {}),
  };
}

/** 최신 글이 먼저. 목록·RSS·sitemap이 전부 이 순서를 쓴다. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
