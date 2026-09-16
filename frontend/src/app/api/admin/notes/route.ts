import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import { revalidateNotes } from '@/lib/cache-tags';
import { isMissingSchemaError } from '@/lib/db-compat';
import { NoteCreate, NoteDelete, NoteUpdate } from '@/lib/admin/schemas';
import {
  ARCHIVE_EXTRAS_MIGRATION,
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
  pgCode,
} from '@/lib/admin/route-helpers';

/**
 * 노트 — 목록(초안 포함), 쓰기, 고치기, 지우기.
 *
 * 공개 화면이 바뀌는 것은 **공개된** 글이 바뀔 때뿐이다. 초안만 고쳤으면 아무것도
 * 무효화하지 않는다. 공개된 글이 0편 ↔ 1편 이상으로 바뀌면 푸터 링크가 생기거나
 * 사라지므로 레이아웃까지 다시 굽는다(`revalidateNotes`).
 */

const COLUMNS = 'id, slug, title, date, summary, tags, body, boundary, related_project, published, created_at, updated_at';

/** 지금 공개된 글의 id. 변경 전후를 비교해 무엇을 다시 구울지 정한다. */
async function publishedIds(db: SupabaseClient): Promise<{ ids: Set<number> } | { error: unknown }> {
  const { data, error } = await db.from('notes').select('id').eq('published', true);
  if (error) return { error };
  return { ids: new Set((data ?? []).map(row => row.id as number)) };
}

function afterChange(before: Set<number>, after: Set<number>, touched: number): void {
  const wasPublic = before.has(touched);
  const isPublic = after.has(touched);
  if (!wasPublic && !isPublic) return;
  revalidateNotes({ presenceChanged: (before.size > 0) !== (after.size > 0) });
}

function slugTaken(error: unknown): NextResponse | null {
  // 23505: unique_violation — 슬러그는 글 주소라 겹칠 수 없다.
  return pgCode(error) === '23505' ? jsonError('이미 다른 글이 쓰는 슬러그입니다.', 409) : null;
}

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_notes');
  if (!db.ok) return db.response;

  const { data, error } = await db.value
    .from('notes')
    .select(COLUMNS)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    if (isMissingSchemaError(error)) return NextResponse.json({ notes: [], migrationPending: true });
    return dbErrorResponse('admin_notes_list', error, ARCHIVE_EXTRAS_MIGRATION);
  }
  return NextResponse.json({ notes: data ?? [], migrationPending: false });
}

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, NoteCreate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_notes');
  if (!db.ok) return db.response;

  const before = await publishedIds(db.value);
  if ('error' in before) return dbErrorResponse('admin_notes_before', before.error, ARCHIVE_EXTRAS_MIGRATION);

  const { data, error } = await db.value.from('notes').insert(body.value).select(COLUMNS).single();
  if (error) return slugTaken(error) ?? dbErrorResponse('admin_notes_create', error, ARCHIVE_EXTRAS_MIGRATION);

  const after = await publishedIds(db.value);
  if (!('error' in after)) afterChange(before.ids, after.ids, data.id as number);
  log.info('admin_notes_created', { id: data.id, slug: data.slug, published: data.published });
  return NextResponse.json({ note: data });
}

export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, NoteUpdate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_notes');
  if (!db.ok) return db.response;

  const { id, ...updates } = body.value;
  const before = await publishedIds(db.value);
  if ('error' in before) return dbErrorResponse('admin_notes_before', before.error, ARCHIVE_EXTRAS_MIGRATION);

  const { data, error } = await db.value.from('notes').update(updates).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) return slugTaken(error) ?? dbErrorResponse('admin_notes_update', error, ARCHIVE_EXTRAS_MIGRATION);
  if (!data) return jsonError('글을 찾을 수 없습니다.', 404);

  const after = await publishedIds(db.value);
  if (!('error' in after)) afterChange(before.ids, after.ids, id);
  return NextResponse.json({ note: data });
}

export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, NoteDelete);
  if (!body.ok) return body.response;
  const db = adminDb('admin_notes');
  if (!db.ok) return db.response;

  const before = await publishedIds(db.value);
  if ('error' in before) return dbErrorResponse('admin_notes_before', before.error, ARCHIVE_EXTRAS_MIGRATION);

  const { data, error } = await db.value.from('notes').delete().eq('id', body.value.id).select('id, slug').maybeSingle();
  if (error) return dbErrorResponse('admin_notes_delete', error, ARCHIVE_EXTRAS_MIGRATION);
  if (!data) return jsonError('글을 찾을 수 없습니다.', 404);

  const after = await publishedIds(db.value);
  if (!('error' in after)) afterChange(before.ids, after.ids, body.value.id);
  log.info('admin_notes_deleted', { id: data.id, slug: data.slug });
  return NextResponse.json({ ok: true, id: data.id });
}
