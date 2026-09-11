import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCloudinaryConfig } from '@/lib/cloudinary-upload';
import { publicIdFromUrl } from '@/lib/cloudinary';
import { log } from '@/lib/logger';

/**
 * Cloudinary에는 남아 있지만 `photos`에는 없는 파일을 찾는다.
 *
 * 사진을 내려도 원본을 지우지 않는 것은 의도된 설계다 — 사이트에서 내리는
 * 것과 원본을 파기하는 것은 되돌릴 수 있는 정도가 다르고, 초기 사진들은 이
 * 화면을 거치지 않고 콘솔에서 직접 올라왔다. 문제는 그래서 **무엇이 남았는지
 * 알 방법이 없었다는 것**이다. README는 "용량 정리는 콘솔에서 따로"라고 적어
 * 두었지만, 콘솔에는 어느 파일이 아직 쓰이는지가 표시되지 않는다.
 *
 * 이 엔드포인트는 목록만 만든다. 지우지 않는다. 지우는 것은 여전히 사람이
 * 콘솔에서 하는 일이고, 여기서 하는 일은 "이건 지워도 된다"를 알려 주는
 * 것까지다.
 */

/** 한 번에 훑을 자산 수. Cloudinary Admin API는 호출 수에 쿼터가 있다. */
const MAX_ASSETS = 500;

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  bytes: number;
  created_at: string;
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let config;
  try {
    config = getCloudinaryConfig();
  } catch (error) {
    log.error('admin_orphans_config', error);
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_orphans_db', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  // Cloudinary 주소가 들어 있는 **모든** 곳을 모은다.
  //
  // 처음에는 `photos.src`만 봤는데, 그 목록으로는 앨범 커버가 고아로 잡혔다
  // (`phorage/archive/photo_17` — /archive/japan의 커버이자 OG 이미지). 이
  // 목록을 믿고 지웠으면 앨범 표지가 통째로 사라졌을 것이다. 지우는 근거가
  // 되는 목록이므로, 한 군데라도 빠지면 그냥 틀린 게 아니라 위험하다.
  //
  // 테이블이 늘어나면 여기도 늘어나야 한다. 그래서 한 배열에 모아 둔다.
  const [photos, albums, products, settings] = await Promise.all([
    supabase.from('photos').select('src'),
    supabase.from('albums').select('cover'),
    supabase.from('products').select('image_url'),
    supabase.from('site_settings').select('value'),
  ]);

  const failed = [photos, albums, products, settings].find(r => r.error);
  if (failed?.error) {
    log.error('admin_orphans_db_read', failed.error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // 비교는 URL 전체가 아니라 public_id로 한다. 같은 파일이라도 변환 파라미터가
  // 붙으면 URL이 달라지기 때문이다.
  const used = new Set<string>();
  const remember = (value: unknown) => {
    if (typeof value !== 'string') return;
    const id = publicIdFromUrl(value);
    if (id) used.add(id);
  };
  for (const row of photos.data ?? []) remember(row.src);
  for (const row of albums.data ?? []) remember(row.cover);
  for (const row of products.data ?? []) remember(row.image_url);
  // site_settings는 key/value라 어느 키가 이미지인지 여기서 가정하지 않는다 —
  // Cloudinary URL로 파싱되는 값이면 쓰이는 것으로 친다.
  for (const row of settings.data ?? []) remember(row.value);

  // Admin API는 Basic 인증(api_key:api_secret)을 쓴다.
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const endpoint =
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload` +
    `?prefix=phorage/archive/&type=upload&max_results=${MAX_ASSETS}`;

  let resources: CloudinaryResource[];
  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      log.error('admin_orphans_cloudinary', { status: res.status });
      return NextResponse.json({ error: 'Cloudinary 조회에 실패했습니다.' }, { status: 502 });
    }
    resources = ((await res.json()) as { resources?: CloudinaryResource[] }).resources ?? [];
  } catch (error) {
    log.error('admin_orphans_fetch', error);
    return NextResponse.json({ error: 'Cloudinary에 연결하지 못했습니다.' }, { status: 502 });
  }

  const orphans = resources
    .filter(r => !used.has(r.public_id))
    .map(r => ({
      publicId: r.public_id,
      url: r.secure_url,
      bytes: r.bytes,
      createdAt: r.created_at,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return NextResponse.json({
    scanned: resources.length,
    // 훑은 범위를 넘어섰는지 알려 준다. 넘었다면 이 목록은 완전하지 않다.
    truncated: resources.length >= MAX_ASSETS,
    // 훑은 자산 중 실제로 쓰이는 수. DB가 참조하는 총수(`referenced`)와는
    // 다르다 — 참조 중 일부는 이 접두사 밖의 자산을 가리킨다.
    matched: resources.length - orphans.length,
    referenced: used.size,
    orphans,
    totalBytes: orphans.reduce((sum, o) => sum + o.bytes, 0),
  });
}
