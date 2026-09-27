import { takenParts } from './timeline';

/**
 * 홈의 "몇 년 전 오늘": 오늘과 같은 월·일에 찍은 사진.
 *
 * "오늘"은 **서울 날짜**다. 홈은 서버(Vercel, UTC)에서 구워지므로 `new Date()`의
 * UTC 날짜를 그대로 쓰면 서울 자정~오전 9시 사이에 구운 홈이 어제를 오늘이라고
 * 부른다. 반대로 사진의 월·일은 UTC로 읽는다 — `taken_at`은 찍은 곳의 벽시계
 * 시각을 UTC 자리에 적어 둔 값이라, 그렇게 읽어야 찍은 날이 나온다.
 *
 * 딱 그날 찍은 사진이 없는 날이 대부분이다(281장이 1년에 흩어져 있다). 그때는
 * 앞뒤 사흘까지 넓힌다 — 섹션이 1년 중 며칠만 보이면 있는지도 모르는 기능이
 * 된다. 넓힌 결과는 "오늘"이라고 부르지 않도록 `exact`로 구분해 넘긴다.
 */

export interface OnThisDaySource {
  id: number;
  taken_at?: string | null;
}

export interface Memory<T> {
  photo: T;
  /** 오늘 기준 몇 년 전의 "그날"인지. 1 이상. */
  yearsAgo: number;
  /** 월·일이 오늘과 같다. false면 앞뒤 며칠 안. */
  exact: boolean;
}

export interface SeoulDay {
  year: number;
  month: number;
  day: number;
}

/** 서울 기준의 오늘 날짜. */
export function seoulToday(now: Date): SeoulDay {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * 윤년(2000년) 달력 위의 날짜 번호(0–365). 2월 29일이 자리를 갖고, 평년의
 * 2월 28일·3월 1일과 각각 하루 거리가 된다.
 */
function dayIndex(month: number, day: number): number {
  return (Date.UTC(2000, month - 1, day) - Date.UTC(2000, 0, 1)) / 86_400_000;
}

const DAYS = 366;

export function onThisDay<T extends OnThisDaySource>(
  photos: readonly T[],
  today: SeoulDay,
  { window = 3, limit = 6 }: { window?: number; limit?: number } = {},
): { exact: boolean; memories: Memory<T>[] } {
  const todayIndex = dayIndex(today.month, today.day);
  const candidates: Array<Memory<T> & { distance: number; time: number }> = [];

  for (const photo of photos) {
    const parts = takenParts(photo.taken_at);
    if (!parts) continue;
    // 부호 있는 거리를 원형으로 접는다: 12월 30일 사진은 1월 1일에서 사흘 "앞"이다.
    let offset = dayIndex(parts.month, parts.day) - todayIndex;
    if (offset > DAYS / 2) offset -= DAYS;
    if (offset < -DAYS / 2) offset += DAYS;
    const distance = Math.abs(offset);
    if (distance > window) continue;
    // 몇 년 전인지는 "가장 가까운 기념일"의 연도로 센다. 1월 1일에 보는
    // 재작년 12월 30일 사진은 2년이 아니라 1년 전 이맘때다.
    const anniversaryYear = today.year + (todayIndex + offset < 0 ? -1 : todayIndex + offset >= DAYS ? 1 : 0);
    const yearsAgo = anniversaryYear - parts.year;
    // 1년이 안 된 사진은 "몇 년 전"이 아니다. 시계가 틀린 미래 날짜도 여기서 빠진다.
    if (yearsAgo < 1) continue;
    candidates.push({ photo, yearsAgo, exact: distance === 0, distance, time: parts.time });
  }

  const exact = candidates.some(c => c.exact);
  const pool = exact ? candidates.filter(c => c.exact) : candidates;

  // 한 해가 섹션을 독차지하지 않게 연도별로 번갈아 고른다(연사 스무 장이 있는
  // 해가 흔하다). 각 해 안에서는 오늘에 가까운 날, 그다음 찍은 시각 순.
  const byYear = new Map<number, typeof pool>();
  for (const c of pool) {
    const list = byYear.get(c.yearsAgo) ?? [];
    list.push(c);
    byYear.set(c.yearsAgo, list);
  }
  const queues = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) => list.sort((a, b) => a.distance - b.distance || a.time - b.time || a.photo.id - b.photo.id));

  const picked: typeof pool = [];
  for (let round = 0; picked.length < limit; round++) {
    let took = false;
    for (const queue of queues) {
      if (round < queue.length && picked.length < limit) {
        picked.push(queue[round]);
        took = true;
      }
    }
    if (!took) break;
  }

  const memories = picked
    .sort((a, b) => a.yearsAgo - b.yearsAgo || a.distance - b.distance || a.time - b.time)
    .map(({ photo, yearsAgo, exact: isExact }) => ({ photo, yearsAgo, exact: isExact }));
  return { exact, memories };
}
