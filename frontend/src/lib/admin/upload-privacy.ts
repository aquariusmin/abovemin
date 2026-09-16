import { planUpload, type RoundedCoord } from '@/lib/exif-strip';

/**
 * 관리 화면에서 Cloudinary로 보내기 직전의 한 단계 — 파일에서 위치 정보를
 * 지운다. **브라우저 전용**(`createImageBitmap`, canvas).
 *
 * 판단은 `lib/exif-strip.ts`의 `planUpload`가 하고(CLI와 같다), 여기는 그
 * 결과를 `File`로 만드는 일만 한다:
 *  - JPEG → 위치를 뺀 바이트(무손실).
 *  - 위치가 없는 다른 형식 → 원본 그대로.
 *  - 위치가 있는 다른 형식(HEIC·PNG·WebP·TIFF) → 브라우저가 열 수 있으면
 *    canvas로 JPEG(품질 0.95)로 다시 굽는다. canvas가 내보내는 JPEG에는
 *    메타데이터가 없다. 열 수 없으면(Chrome의 HEIC) 올리지 않는다.
 */

export type PrivacyStatus = 'removed' | 'converted' | 'none';

export interface PreparedUpload {
  file: File;
  status: PrivacyStatus;
  /** 소수점 한 자리로 반올림한 좌표. 저장할 때 장소 좌표의 근거로 보낸다. */
  coord: RoundedCoord | null;
  /** 변환으로 EXIF가 사라진 경우를 위해 미리 읽어 둔 촬영 연도. */
  takenYear: number | null;
}

/** 위치 정보를 지울 수 없어 올리지 않은 파일. 메시지는 화면에 그대로 보인다. */
export class UploadBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadBlockedError';
  }
}

export const CONVERTED_NOTICE = '위치 정보를 지우려고 JPEG로 변환했습니다.';
const BLOCKED_MESSAGE =
  '위치 정보가 들어 있는데 이 브라우저에서 지울 수 없는 형식입니다. 사진 앱에서 JPEG로 내보낸 뒤 다시 올려 주세요.';

/** 이미 이 단계를 거친 파일. `uploadToCloudinary`가 같은 파일을 두 번 읽지 않게 한다. */
const prepared = new WeakSet<Blob>();

export function isPrepared(file: Blob): boolean {
  return prepared.has(file);
}

function jpegName(name: string): string {
  return `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
}

async function reencodeAsJpeg(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // 방향(EXIF Orientation)은 디코딩할 때 픽셀에 반영한다 — 새 JPEG에는 EXIF가 없다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UploadBlockedError(BLOCKED_MESSAGE);
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new UploadBlockedError(BLOCKED_MESSAGE);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) throw new UploadBlockedError(BLOCKED_MESSAGE);
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  const plan = planUpload(new Uint8Array(await file.arrayBuffer()));

  let result: PreparedUpload;
  if (plan.kind === 'jpeg') {
    result = {
      file: new File([plan.bytes], file.name, { type: 'image/jpeg', lastModified: file.lastModified }),
      status: plan.locationRemoved ? 'removed' : 'none',
      coord: plan.coord,
      takenYear: null,
    };
  } else if (plan.kind === 'unchanged') {
    result = { file, status: 'none', coord: null, takenYear: null };
  } else {
    result = { file: await reencodeAsJpeg(file), status: 'converted', coord: plan.coord, takenYear: plan.takenYear };
  }
  prepared.add(result.file);
  return result;
}
