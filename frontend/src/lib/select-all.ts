/**
 * 행 수 상한을 넘는 테이블을 끝까지 읽는다.
 *
 * PostgREST는 한 번의 조회에 돌려주는 행 수에 상한이 있다(Supabase 기본 1000,
 * 프로젝트 설정으로 바뀔 수 있다). 상한을 넘으면 오류 없이 **앞부분만** 온다.
 * 목록이 조금 모자라게 보이는 정도로 끝나는 조회도 있지만, "쓰이지 않는 원본
 * 정리"처럼 그 목록에 없는 것을 지우는 코드에서는 잘린 목록이 곧 삭제 대상이
 * 된다.
 *
 * 한 쪽이 `pageSize`보다 짧다고 끝으로 보지 않는다 — 서버 상한이 `pageSize`보다
 * 작으면 모든 쪽이 짧게 오기 때문이다. 받은 만큼 전진하고, **빈 쪽**이 올 때
 * 멈춘다. 조회 한 번을 더 쓰는 대신 상한이 얼마든 맞는다.
 *
 * `fetchPage`는 `.order(...)`로 순서를 고정한 쿼리에 `.range(from, to)`를
 * 붙여 돌려준다. 순서가 고정되지 않으면 쪽 사이에서 행이 빠지거나 겹친다.
 */
export const SELECT_PAGE_SIZE = 1000;

/** 무한 루프 방지. 1000쪽 × 1000행이면 이 사이트가 다룰 크기를 한참 넘는다. */
const MAX_PAGES = 1000;

export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export async function selectAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SELECT_PAGE_SIZE,
): Promise<{ data: T[]; error: null } | { data: null; error: unknown }> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = rows.length;
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: rows, error: null };
    rows.push(...data);
  }
  return { data: null, error: new Error('select_all_page_limit') };
}
