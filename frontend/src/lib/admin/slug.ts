import { ALBUM_SLUG_RE } from './schemas';

/**
 * 앨범 제목 → 슬러그 제안. 제안일 뿐이고 관리자가 고칠 수 있다.
 *
 * 한글 제목은 로마자로 옮기지 않는다 — "제주"를 jeju로 옮기는 규칙은 표기법마다
 * 다르고, 틀린 제안은 빈칸보다 나쁘다(그대로 저장되면 URL로 영원히 남는다).
 * 옮길 수 없는 글자는 빼고, 남는 것이 없으면 빈 문자열을 돌려 직접 적게 한다.
 */
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
