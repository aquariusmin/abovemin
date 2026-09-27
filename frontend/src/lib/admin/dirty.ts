/**
 * 편집기의 "저장하지 않은 변경이 있는가". 닫기·다른 항목 열기·페이지 떠나기
 * 앞에서 물어볼지 정한다.
 *
 * 입력 상태는 문자열·불리언·숫자와 그 배열·객체뿐이다(상품의 이미지·옵션 목록).
 * 그래서 구조 비교로 충분하다 — 순서가 바뀐 배열은 **바뀐 것**이다(이미지 순서는
 * 커버를 정한다). 객체의 키 순서는 따지지 않는다.
 */

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

/**
 * 지금 입력이 기준(연 시점, 또는 마지막으로 저장한 값)과 다른가.
 * `ignore`는 내용이 아닌 화면 상태 필드(예: 노트의 `slugTouched`).
 */
export function isDraftDirty<T extends object>(current: T, baseline: T, ignore: readonly (keyof T)[] = []): boolean {
  const skip = new Set<PropertyKey>(ignore);
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of keys) {
    if (skip.has(key)) continue;
    if (!sameValue((current as Record<string, unknown>)[key], (baseline as Record<string, unknown>)[key])) return true;
  }
  return false;
}
