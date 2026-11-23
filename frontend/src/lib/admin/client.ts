import { isPrepared, prepareUpload } from './upload-privacy';

export const UNAUTHORIZED_EVENT = 'admin:unauthorized';

export class AdminApiError extends Error {
  readonly status: number;
  // 409 + `migration: true`: 서버가 마이그레이션 적용 필요로 거절했다.
  readonly migration: boolean;

  constructor(message: string, status: number, migration = false) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.migration = migration;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function adminFetch<T>(url: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new AdminApiError('네트워크 오류로 요청하지 못했습니다.', 0);
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new AdminApiError('로그인이 만료되었습니다.', 401);
  }
  if (!res.ok) {
    const message = typeof payload.error === 'string' ? payload.error : `요청에 실패했습니다 (${res.status})`;
    throw new AdminApiError(message, res.status, payload.migration === true);
  }
  return payload as T;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface SignResponse {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: Record<string, string | number>;
}

export interface UploadResult {
  secure_url: string;
  image_metadata?: unknown;
}

// 올리는 파일은 항상 위치 정보를 지운 것이다 — 원본은 URL만 알면 누구나 받는다.
export async function uploadToCloudinary(file: File, sign: SignResponse): Promise<UploadResult> {
  const upload = isPrepared(file) ? file : (await prepareUpload(file)).file;
  const form = new FormData();
  form.append('file', upload);
  form.append('api_key', sign.apiKey);
  form.append('signature', sign.signature);
  for (const [key, value] of Object.entries(sign.params)) form.append(key, String(value));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !body.secure_url) {
    throw new Error(body?.error?.message || `업로드 실패 (${res.status})`);
  }
  return body as UploadResult;
}

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 클릭 직후 바로 되돌리면 일부 브라우저에서 다운로드가 취소된다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
