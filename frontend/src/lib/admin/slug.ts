import { ALBUM_SLUG_RE } from './limits';

// 한글은 로마자로 옮기지 않는다 — 틀린 제안은 URL로 영원히 남는다.
export function suggestSlug(title: string): string {
  return title
    .normalize('NFKD')
    // 결합 발음 부호(é → e)만 뗀다. 한글 자모는 이 범위가 아니다.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return ALBUM_SLUG_RE.test(slug);
}
