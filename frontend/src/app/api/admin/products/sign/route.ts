import { NextResponse } from 'next/server';
import { signUploadParams, SHOP_UPLOAD_FOLDER } from '@/lib/cloudinary-upload';
import { CLOUDINARY_UPLOAD_NOT_CONFIGURED, adminCloudinary, guardMutation } from '@/lib/admin/route-helpers';

// 상품은 폴더가 고정된 별도 서명 경로다 — folder가 서명 대상이라 클라이언트가 못 바꾼다.
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;

  const cloudinary = adminCloudinary('admin_products_sign', CLOUDINARY_UPLOAD_NOT_CONFIGURED);
  if (!cloudinary.ok) return cloudinary.response;
  const config = cloudinary.value;

  const params = {
    folder: SHOP_UPLOAD_FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return NextResponse.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    signature: signUploadParams(params, config.apiSecret),
    params,
  });
}
