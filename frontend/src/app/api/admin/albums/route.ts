import { NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { revalidateArchive } from '@/lib/admin/revalidate';
import { withColumnFallback } from '@/lib/db-compat';
import { AlbumCreate, AlbumUpdate, Id } from '@/lib/admin/schemas';
import {
  adminDb,
  dbErrorResponse,
  guardMutation,
  guardRead,
  jsonError,
  parseBody,
  pgCode,
} from '@/lib/admin/route-helpers';

const FULL_COLUMNS = 'id, title, slug, cover, sort_order, published, description, created_at';
const LEGACY_COLUMNS = 'id, title, slug, cover, sort_order';

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_albums');
  if (!db.ok) return db.response;

  const [albums, photos] = await Promise.all([
    withColumnFallback(
      'admin_albums.list',
      () => db.value.from('albums').select(FULL_COLUMNS).order('sort_order'),
      () => db.value.from('albums').select(LEGACY_COLUMNS).order('sort_order'),
    ),
    withColumnFallback(
      'admin_albums.photos',
      () => db.value.from('photos').select('album_slug, hidden'),
      () => db.value.from('photos').select('album_slug'),
    ),
  ]);
  if (albums.error) return dbErrorResponse('admin_albums_fetch', albums.error);
  if (photos.error) return dbErrorResponse('admin_albums_photos', photos.error);

  const total = new Map<string, number>();
  const hidden = new Map<string, number>();
  for (const row of (photos.data ?? []) as Array<{ album_slug: string; hidden?: boolean }>) {
    total.set(row.album_slug, (total.get(row.album_slug) ?? 0) + 1);
    if (row.hidden) hidden.set(row.album_slug, (hidden.get(row.album_slug) ?? 0) + 1);
  }

  return NextResponse.json({
    albums: ((albums.data ?? []) as Array<Record<string, unknown> & { slug: string }>).map(album => ({
      published: true,
      description: null,
      ...album,
      photo_count: total.get(album.slug) ?? 0,
      hidden_count: hidden.get(album.slug) ?? 0,
    })),
    migrationPending: albums.migrationPending || photos.migrationPending,
  });
}

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, AlbumCreate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_albums');
  if (!db.ok) return db.response;

  const { data: last, error: lastError } = await db.value
    .from('albums')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return dbErrorResponse('admin_albums_sort_order', lastError);

  const row: Record<string, unknown> = {
    title: body.value.title,
    slug: body.value.slug,
    sort_order: (last?.sort_order ?? 0) + 1,
  };
  // description은 새 컬럼이라 비어 있으면 보내지 않는다 — 마이그레이션 전에도 만들기가 된다.
  if (body.value.description) row.description = body.value.description;

  const { data, error } = await db.value.from('albums').insert(row).select('*').single();
  if (error) {
    // 조회 후 삽입은 경합이 생기므로, 넣어 보고 unique 위반을 사람 말로 바꾼다.
    if (pgCode(error) === '23505') return jsonError('이미 쓰고 있는 슬러그입니다.', 409);
    return dbErrorResponse('admin_albums_insert', error);
  }

  revalidateArchive();
  return NextResponse.json({ ok: true, album: data });
}

export async function PATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, AlbumUpdate);
  if (!body.ok) return body.response;
  const db = adminDb('admin_albums');
  if (!db.ok) return db.response;

  const { id, title, slug, description, published, cover_photo_id } = body.value;

  const { data: album, error: albumError } = await db.value
    .from('albums')
    .select('id, slug')
    .eq('id', id)
    .maybeSingle();
  if (albumError) return dbErrorResponse('admin_albums_lookup', albumError);
  if (!album) return jsonError('앨범을 찾을 수 없습니다.', 404);

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (slug !== undefined && slug !== album.slug) updates.slug = slug;
  if (description !== undefined) updates.description = description;
  if (published !== undefined) updates.published = published;

  if (cover_photo_id !== undefined) {
    // 커버는 id만 받고 src는 서버가 찾는다 — 외부 URL이나 남의 앨범 사진이 커버가 되지 않게.
    const { data: photo, error: photoError } = await db.value
      .from('photos')
      .select('src')
      .eq('id', cover_photo_id)
      .eq('album_slug', album.slug)
      .maybeSingle();
    if (photoError) return dbErrorResponse('admin_albums_cover', photoError);
    if (!photo) return jsonError('이 앨범의 사진만 커버로 고를 수 있습니다.', 400);
    updates.cover = photo.src;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('변경할 내용이 없습니다.', 400);
  }

  const { data, error } = await db.value
    .from('albums')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) {
    const code = pgCode(error);
    if (code === '23505') return jsonError('이미 쓰고 있는 슬러그입니다.', 409);
    // 마이그레이션 전 FK에는 on update cascade가 없어 슬러그 변경이 23503으로 막힌다.
    if (code === '23503') {
      return jsonError(
        '사진이 있는 앨범의 슬러그를 바꾸려면 마이그레이션(FK on update cascade)이 먼저 필요합니다.',
        409,
        { migration: true },
      );
    }
    return dbErrorResponse('admin_albums_update', error);
  }
  if (!data) return jsonError('앨범을 찾을 수 없습니다.', 404);

  if (updates.slug) log.info('admin_albums_slug_renamed', { id, from: album.slug, to: updates.slug });
  revalidateArchive();
  return NextResponse.json({ ok: true, album: data });
}

export async function DELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, z.strictObject({ id: Id }));
  if (!body.ok) return body.response;
  const db = adminDb('admin_albums');
  if (!db.ok) return db.response;

  const { data: album, error: albumError } = await db.value
    .from('albums')
    .select('id, slug, title')
    .eq('id', body.value.id)
    .maybeSingle();
  if (albumError) return dbErrorResponse('admin_albums_lookup', albumError);
  if (!album) return jsonError('앨범을 찾을 수 없습니다.', 404);

  const { count, error: countError } = await db.value
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('album_slug', album.slug);
  if (countError) return dbErrorResponse('admin_albums_count', countError);
  if ((count ?? 0) > 0) {
    return jsonError(`사진이 ${count}장 남아 있어 지울 수 없습니다. 먼저 옮기거나 지워 주세요.`, 409);
  }

  const { error } = await db.value.from('albums').delete().eq('id', album.id);
  if (error) {
    if (pgCode(error) === '23503') return jsonError('사진이 남아 있어 지울 수 없습니다.', 409);
    return dbErrorResponse('admin_albums_delete', error);
  }

  log.info('admin_albums_deleted', { id: album.id, slug: album.slug });
  revalidateArchive();
  return NextResponse.json({ ok: true, id: album.id });
}
