/**
 * 관리 화면(브라우저)에서 관리 API를 부르는 한 가지 방법.
 *
 * 탭이 여섯 개로 늘면서 `fetch → res.ok 확인 → body.error 꺼내기 → 401이면
 * 로그인으로`를 스무 군데에 적게 됐다. 한 곳이라도 401을 놓치면 세션이 끝난
 * 화면이 "DB error"만 띄우고 멈춘다. 여기서 한 번에 처리한다.
 */

export const UNAUTHORIZED_EVENT = 'admin:unauthorized';

export class AdminApiError extends Error {
  readonly status: number;
  /** 서버가 "마이그레이션 적용 필요"로 거절했는가(409 + `migration: true`). */
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
    // 세션이 끝났다. 셸이 이 이벤트를 듣고 로그인 화면으로 돌아간다.
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

// ── Cloudinary 직접 업로드 ───────────────────────────────────────────────────

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

/**
 * 서명받은 파라미터로 파일 하나를 Cloudinary에 올린다. 파일은 우리 서버를
 * 거치지 않는다(`lib/cloudinary-upload.ts` 참고). 서명 하나를 여러 장이 쓴다.
 */
export async function uploadToCloudinary(file: File, sign: SignResponse): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
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

/** 파일 내려받기. 서버를 거칠 이유가 없는 CSV 같은 것에 쓴다. */
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
