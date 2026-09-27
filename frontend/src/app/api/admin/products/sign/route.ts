import { NextResponse } from 'next/server';
import { getCloudinaryConfig, signUploadParams, SHOP_UPLOAD_FOLDER } from '@/lib/cloudinary-upload';
import { log } from '@/lib/logger';
import { guardMutation, jsonError } from '@/lib/admin/route-helpers';

/**
 * 상품 이미지를 브라우저가 Cloudinary에 직접 올리기 위한 서명.
 *
 * `api/admin/photos/sign`과 따로 두는 이유: 그쪽은 **존재하는 앨범**의 폴더에만
 * 서명한다(없는 슬러그로 폴더가 생기지 않게). 폴더를 요청 본문으로 받게
 * 일반화하면 그 검증이 느슨해지므로, 상품은 폴더가 고정된 별도 경로로 둔다.
 * 서명 대상 파라미터에 `folder`가 들어가므로 클라이언트가 폴더를 바꿀 수 없다.
 */
export async function POST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;

  let config;
  try {
    config = getCloudinaryConfig();
  } catch (error) {
    log.error('admin_products_sign_cloudinary', error);
    return jsonError('Cloudinary upload is not configured', 503);
  }

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
