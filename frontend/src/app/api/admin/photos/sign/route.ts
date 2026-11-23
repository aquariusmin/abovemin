import { NextResponse } from 'next/server';
import { signUploadParams, uploadFolder } from '@/lib/cloudinary-upload';
import { PhotoSign } from '@/lib/admin/schemas';
import {
  CLOUDINARY_UPLOAD_NOT_CONFIGURED,
  adminCloudinary,
  adminDb,
  guardMutation,
  jsonError,
  parseBody,
} from '@/lib/admin/route-helpers';

export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body = await parseBody(request, PhotoSign);
  if (!body.ok) return body.response;
  const albumSlug = body.value.album_slug;
  const db = adminDb('admin_photos_sign');
  if (!db.ok) return db.response;

  // 존재하지 않는 앨범으로 폴더가 생기지 않도록 먼저 확인한다.
  const { data: album, error: albumError } = await db.value
    .from('albums')
    .select('slug')
    .eq('slug', albumSlug)
    .single();
  if (albumError || !album) return jsonError('Album not found', 404);

  const cloudinary = adminCloudinary('admin_photos_sign', CLOUDINARY_UPLOAD_NOT_CONFIGURED);
  if (!cloudinary.ok) return cloudinary.response;
  const config = cloudinary.value;

  // image_metadata를 켜야 응답에 EXIF가 실린다(촬영 연도 자동 채우기의 근거).
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
