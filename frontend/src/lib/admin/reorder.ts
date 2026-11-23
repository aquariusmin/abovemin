export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function moveById<T>(list: readonly T[], id: T, direction: -1 | 1): T[] {
  const from = list.indexOf(id);
  return moveItem(list, from, from + direction);
}

// 아래로 끌어 내리면 targetId 뒤에, 아니면 앞에 놓는다.
export function dropOnto<T>(list: readonly T[], draggedId: T, targetId: T): T[] {
  return moveItem(list, list.indexOf(draggedId), list.indexOf(targetId));
}

export function rangeBetween<T>(order: readonly T[], anchorId: T | null, targetId: T): T[] {
  const end = order.indexOf(targetId);
  if (end < 0) return [];
  const start = anchorId === null ? -1 : order.indexOf(anchorId);
  if (start < 0) return [targetId];
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return order.slice(lo, hi + 1);
}

// 같은 입력을 다시 넣으면 빈 배열 — 요청이 멱등인 근거다.
export function renumberChanges(
  ids: readonly number[],
  current: ReadonlyMap<number, number>,
): Array<{ id: number; sortOrder: number }> {
  return ids
    .map((id, index) => ({ id, sortOrder: index + 1 }))
    .filter(({ id, sortOrder }) => current.get(id) !== sortOrder);
}

// 보낸 id 집합이 DB와 다르면 화면이 낡은 것이다.
export function sameIdSet(ids: readonly number[], known: Iterable<number>): boolean {
  const set = new Set(known);
  return set.size === ids.length && ids.every(id => set.has(id));
}
