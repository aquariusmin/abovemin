import { NextResponse } from 'next/server';
import { isAdminRequest, assertSameOrigin } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCloudinaryConfig, signUploadParams, uploadFolder } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';

/**
 * 브라우저가 Cloudinary에 직접 업로드하기 위한 서명을 발급한다.
 *
 * 한 번 받은 서명은 같은 앨범에 올리는 여러 장에 재사용된다 — 서명이 파일이
 * 아니라 파라미터에만 걸리기 때문이다. 자세한 배경은 `lib/cloudinary-upload.ts`.
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
  if (typeof albumSlug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(albumSlug)) {
    return NextResponse.json({ error: 'Invalid album_slug' }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    log.error('admin_photos_sign_config', error);
    return NextResponse.json({ error: 'Admin database is not configured' }, { status: 503 });
  }

  // 존재하지 않는 앨범으로 폴더가 생기지 않도록 먼저 확인한다.
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('slug')
    .eq('slug', albumSlug)
    .single();
  if (albumError || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  let config;
  try {
    config = getCloudinaryConfig();
  } catch (error) {
    log.error('admin_photos_sign_cloudinary', error);
    return NextResponse.json({ error: 'Cloudinary upload is not configured' }, { status: 503 });
  }

  // `image_metadata`를 켜야 응답에 EXIF가 실린다. 촬영 연도를 자동으로 채우는
  // 근거가 이것뿐이라 서명 대상 파라미터에 포함한다.
  const params = {
    folder: uploadFolder(albumSlug),
    image_metadata: 'true',
    timestamp: Math.floor(Date.now() / 1000),
  };

  return NextResponse.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    signature: signUploadParams(params, config.apiSecret),
    params,
  });
}
