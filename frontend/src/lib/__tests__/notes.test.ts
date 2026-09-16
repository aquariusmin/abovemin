import { describe, expect, it } from 'vitest';
import { NOTE_SLUG_RE, noteFromRow, parseTags, sortNotes, splitParagraphs, suggestNoteSlug } from '@/lib/notes';
import { NoteCreate, NoteUpdate } from '@/lib/admin/schemas';

/**
 * 이 파일이 지키는 것: 관리 화면에서 적은 텍스트가 공개 화면에서 같은 문단으로
 * 나뉘고, `boundary` 없는 글은 저장도 공개도 되지 않는다.
 */

describe('splitParagraphs', () => {
  it('빈 줄로 문단을 나눈다', () => {
    expect(splitParagraphs('첫 문단.\n\n둘째 문단.')).toEqual(['첫 문단.', '둘째 문단.']);
  });

  it('공백만 있는 줄·여러 빈 줄·CRLF도 한 경계다', () => {
    expect(splitParagraphs('a\r\n\r\nb\n  \n\n\nc')).toEqual(['a', 'b', 'c']);
  });

  it('문단 안의 줄바꿈은 그대로, 앞뒤 공백은 걷는다', () => {
    expect(splitParagraphs('  한 줄\n이어지는 줄  \n\n')).toEqual(['한 줄\n이어지는 줄']);
    expect(splitParagraphs('   \n\n ')).toEqual([]);
  });
});

describe('parseTags', () => {
  it('쉼표로 나누고 빈 값·중복을 뺀다', () => {
    expect(parseTags('대체데이터, 회귀 ,, 회귀,')).toEqual(['대체데이터', '회귀']);
    expect(parseTags('')).toEqual([]);
  });
});

describe('suggestNoteSlug', () => {
  it('영문 제목은 슬러그로, 한글만 있으면 빈칸', () => {
    expect(suggestNoteSlug('Night lights & GDP')).toBe('night-lights-gdp');
    expect(suggestNoteSlug('야간조도로 GDP를')).toBe('gdp');
    expect(suggestNoteSlug('야간조도')).toBe('');
    expect(NOTE_SLUG_RE.test(suggestNoteSlug('a'.repeat(120)))).toBe(true);
  });
});

const row = {
  id: 1,
  slug: 'night-lights-and-gdp',
  title: '야간조도로 GDP를 얼마나 말할 수 있나',
  date: '2026-09-20',
  summary: '한 문단.',
  tags: ['대체데이터', ' '],
  body: '첫 문단.\n\n둘째 문단.',
  boundary: ' 인과를 말하지 않는다. ',
  related_project: null,
  published: true,
};

describe('noteFromRow', () => {
  it('행을 예전 `Note` 모양으로', () => {
    expect(noteFromRow(row)).toEqual({
      slug: 'night-lights-and-gdp',
      title: '야간조도로 GDP를 얼마나 말할 수 있나',
      date: '2026-09-20',
      summary: '한 문단.',
      tags: ['대체데이터'],
      body: ['첫 문단.', '둘째 문단.'],
      boundary: '인과를 말하지 않는다.',
    });
    expect(noteFromRow({ ...row, related_project: 'satellite-gdp' })?.relatedProject).toBe('satellite-gdp');
  });

  it('해석 범위나 본문이 비었거나 슬러그가 틀리면 글이 아니다', () => {
    expect(noteFromRow({ ...row, boundary: '  ' })).toBeNull();
    expect(noteFromRow({ ...row, body: '\n\n' })).toBeNull();
    expect(noteFromRow({ ...row, slug: 'Bad Slug' })).toBeNull();
  });
});

describe('sortNotes', () => {
  it('최신 글이 먼저', () => {
    const a = noteFromRow({ ...row, slug: 'a', date: '2026-01-01' })!;
    const b = noteFromRow({ ...row, slug: 'b', date: '2026-03-01' })!;
    expect(sortNotes([a, b]).map(n => n.slug)).toEqual(['b', 'a']);
  });
});

describe('NoteCreate / NoteUpdate', () => {
  const valid = {
    slug: 'night-lights-and-gdp',
    title: ' 제목 ',
    date: '2026-09-20',
    summary: '요약',
    tags: ['대체데이터'],
    body: '본문',
    boundary: '말하지 않는 것',
    related_project: null,
    published: false,
  };

  it('받고 다듬는다', () => {
    expect(NoteCreate.parse(valid)).toMatchObject({ title: '제목', related_project: null });
  });

  it('해석 범위는 필수다', () => {
    expect(NoteCreate.safeParse({ ...valid, boundary: '   ' }).success).toBe(false);
    const { boundary: _boundary, ...withoutBoundary } = valid;
    expect(NoteCreate.safeParse(withoutBoundary).success).toBe(false);
  });

  it('슬러그·날짜·태그 규칙과 모르는 키', () => {
    expect(NoteCreate.safeParse({ ...valid, slug: 'Night' }).success).toBe(false);
    expect(NoteCreate.safeParse({ ...valid, slug: 'a'.repeat(81) }).success).toBe(false);
    expect(NoteCreate.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(NoteCreate.safeParse({ ...valid, date: '20260920' }).success).toBe(false);
    expect(NoteCreate.safeParse({ ...valid, tags: Array.from({ length: 13 }, (_, i) => `t${i}`) }).success).toBe(false);
    expect(NoteCreate.safeParse({ ...valid, id: 3 }).success).toBe(false);
  });

  it('수정은 id + 바꿀 것만', () => {
    expect(NoteUpdate.safeParse({ id: 1, published: true }).success).toBe(true);
    expect(NoteUpdate.safeParse({ id: 1 }).success).toBe(false);
    expect(NoteUpdate.safeParse({ id: 1, boundary: '' }).success).toBe(false);
  });
});
