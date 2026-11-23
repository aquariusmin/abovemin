// PostgREST 행 상한은 오류 없이 앞부분만 준다. 짧은 쪽이 아니라 빈 쪽에서 멈춘다. fetchPage는 순서 고정 필수.
export const SELECT_PAGE_SIZE = 1000;

// 무한 루프 방지 상한.
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
