// 홈 겨울 장식 기간(KST). 다음 겨울에는 두 날짜만 바꾼다.
export const WINTER_DECOR = {
  from: new Date('2026-11-23T00:00:00+09:00'),
  until: new Date('2027-01-01T00:00:00+09:00'),
} as const;

export function isWinterDecor(now: Date = new Date(), window: { from: Date; until: Date } = WINTER_DECOR): boolean {
  const t = now.getTime();
  return t >= window.from.getTime() && t < window.until.getTime();
}
