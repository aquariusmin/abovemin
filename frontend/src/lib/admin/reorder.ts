/**
 * 순서 변경과 범위 선택. 사진·앨범 목록이 같이 쓴다.
 *
 * 화면 상태를 바꾸는 계산이지만 DOM과 무관하므로 여기로 뺐다 — 드래그 앤 드롭,
 * 위/아래 버튼, shift-클릭이 모두 "배열 → 배열"이고, 경계 조건(맨 앞/맨 뒤,
 * 제자리 드롭, 이미 지워진 id)에서 틀리기 쉽다.
 */

/** `from` 자리의 항목을 빼서 `to` 자리에 넣는다. 범위를 벗어나면 원본 그대로. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** 위/아래 버튼 한 번. */
export function moveById<T>(list: readonly T[], id: T, direction: -1 | 1): T[] {
  const from = list.indexOf(id);
  return moveItem(list, from, from + direction);
}

/**
 * 드래그 앤 드롭. `targetId` 앞에 놓는다 — 단, 아래로 끌어 내리는 경우에는
 * 뒤에 놓는다. 사람이 보기에 "그 칸 위에 놓았다"는 그 칸의 자리를 차지한다는
 * 뜻이고, 방향에 따라 앞/뒤가 달라지는 것이 자연스럽다.
 */
export function dropOnto<T>(list: readonly T[], draggedId: T, targetId: T): T[] {
  return moveItem(list, list.indexOf(draggedId), list.indexOf(targetId));
}

/**
 * shift-클릭 범위. `anchorId`부터 `targetId`까지(양 끝 포함)를 화면 순서대로
 * 돌려준다. 기준점이 목록에 없으면(필터로 사라졌거나 지워졌으면) 대상 하나만.
 */
export function rangeBetween<T>(order: readonly T[], anchorId: T | null, targetId: T): T[] {
  const end = order.indexOf(targetId);
  if (end < 0) return [];
  const start = anchorId === null ? -1 : order.indexOf(anchorId);
  if (start < 0) return [targetId];
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return order.slice(lo, hi + 1);
}

/**
 * 전체 순서 → 실제로 바뀌는 행만. `sort_order`는 1..n으로 다시 매긴다.
 * 한 칸 이동이면 보통 두 행만 나오므로 요청 수가 준다. 같은 입력을 다시 넣으면
 * 빈 배열 — 요청이 멱등인 근거다.
 */
export function renumberChanges(
  ids: readonly number[],
  current: ReadonlyMap<number, number>,
): Array<{ id: number; sortOrder: number }> {
  return ids
    .map((id, index) => ({ id, sortOrder: index + 1 }))
    .filter(({ id, sortOrder }) => current.get(id) !== sortOrder);
}

/** 보낸 id 집합이 DB의 집합과 정확히 같은가. 다르면 화면이 낡은 것이다. */
export function sameIdSet(ids: readonly number[], known: Iterable<number>): boolean {
  const set = new Set(known);
  return set.size === ids.length && ids.every(id => set.has(id));
}
