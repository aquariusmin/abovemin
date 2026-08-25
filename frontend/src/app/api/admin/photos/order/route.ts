import { NextResponse } from 'next/server';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';

const ALBUM_SLUG = /^[a-z0-9-]{1,64}$/;
/** 한 앨범에 이보다 많은 사진이 쌓이면 순서 변경 UI 자체를 다시 생각해야 한다. */
const MAX_PHOTOS = 500;
/** 동시에 보낼 update 수. PostgREST는 한 번에 하나의 값만 쓰므로 행마다 호출한다. */
const CHUNK = 8;

/**
 * 앨범 안 사진 순서를 통째로 다시 매긴다. 받은 `ids` 순서대로 `sort_order`가
 * 1..n이 된다.
 *
 * 전체 목록을 받는 이유는 부분 이동만 받으면 서버가 나머지를 어떻게 밀어야
 * 할지 추측해야 하고, 그 사이 다른 곳에서 사진이 추가되면 어긋나기 때문이다.
 * 보낸 id 집합이 DB의 그 앨범 사진과 정확히 일치하지 않으면 409로 거절한다 —
 * 화면이 낡았다는 뜻이므로 다시 불러와야 한다.
 *
 * PostgREST에는 트랜잭션이 없어 중간에 실패하면 일부만 반영될 수 있다. 대신
 * 이 요청은 멱등이다: 같은 `ids`를 다시 보내면 같은 결과로 수렴한다.
 */
export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const albumSlug = (body as { album_slug?: unknown }).album_slug;
  const rawIds = (body as { ids?: unknown }).ids;

  if (typeof albumSlug !== 'string' || !ALBUM_SLUG.test(albumSlug)) {
    return NextResponse.json({ error: 'Invalid album_slug' }, { status: 400 });
  }
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > MAX_PHOTOS) {
    return NextResponse.json({ error: '순서 목록이 올바르지 않습니다.' }, { status: 400 });
  }

  const ids: number[] = [];
  for (const raw of rawIds) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: '순서 목록에 잘못된 id가 있습니다.' }, { status: 400 });
    }
    ids.push(id);
  }
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: '순서 목록에 중복된 id가 있습니다.' }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_order_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  const { data: current, error: fetchError } = await supabase
    .from('photos')
    .select('id, sort_order')
    .eq('album_slug', albumSlug);

  if (fetchError) {
    log.error('admin_photos_order_fetch', fetchError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const rows = current ?? [];
  const known = new Map(rows.map(row => [row.id as number, row.sort_order as number]));
  if (rows.length !== ids.length || ids.some(id => !known.has(id))) {
    return NextResponse.json(
      { error: '목록이 최신이 아닙니다. 새로 고친 뒤 다시 시도해 주세요.' },
      { status: 409 },
    );
  }

  // 값이 이미 맞는 행은 건드리지 않는다 — 한 칸 이동이면 보통 두 행만 바뀐다.
  const changes = ids
    .map((id, index) => ({ id, sortOrder: index + 1 }))
    .filter(({ id, sortOrder }) => known.get(id) !== sortOrder);

  if (changes.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  for (let i = 0; i < changes.length; i += CHUNK) {
    const results = await Promise.all(
      changes.slice(i, i + CHUNK).map(({ id, sortOrder }) =>
        supabase.from('photos').update({ sort_order: sortOrder }).eq('id', id),
      ),
    );
    const failed = results.find(result => result.error);
    if (failed?.error) {
      log.error('admin_photos_order_update', failed.error);
      return NextResponse.json(
        { error: '순서를 저장하지 못했습니다. 다시 시도해 주세요.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, updated: changes.length });
}
