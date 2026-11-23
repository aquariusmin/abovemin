/**
 * 홈 화면의 겨울 장식(눈, 상자 위에 쌓인 눈, 전구 줄)을 켜 두는 기간.
 *
 * 2026-11-23에 켜서 12월 31일까지만 둔다. 끝은 한국 시간 2027-01-01 0시 —
 * 그 뒤로 다시 그려지는 홈(ISR, 60초)부터 장식이 사라진다. 다음 겨울에 다시
 * 켜려면 두 날짜만 바꾼다.
 */
export const WINTER_DECOR = {
  from: new Date('2026-11-23T00:00:00+09:00'),
  until: new Date('2027-01-01T00:00:00+09:00'),
} as const;

export function isWinterDecor(now: Date = new Date(), window: { from: Date; until: Date } = WINTER_DECOR): boolean {
  const t = now.getTime();
  return t >= window.from.getTime() && t < window.until.getTime();
}
