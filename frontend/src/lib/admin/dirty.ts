// 순서가 바뀐 배열은 바뀐 것이다(이미지 순서가 커버를 정한다).

export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = Object.keys(aRecord);
  if (keys.length !== Object.keys(bRecord).length) return false;
  return keys.every(key => Object.hasOwn(bRecord, key) && sameValue(aRecord[key], bRecord[key]));
}

export function isDraftDirty<T extends object>(current: T, baseline: T, ignore: readonly (keyof T)[] = []): boolean {
  const skip = new Set<PropertyKey>(ignore);
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of keys) {
    if (skip.has(key)) continue;
    if (!sameValue((current as Record<string, unknown>)[key], (baseline as Record<string, unknown>)[key])) return true;
  }
  return false;
}
