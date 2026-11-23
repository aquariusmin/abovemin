import { takenParts } from './timeline';

// "오늘"은 서울 날짜(서버는 UTC), 사진의 월·일은 UTC로 읽는다(`taken_at`은 벽시계 시각을 UTC 자리에 저장).
export interface OnThisDaySource {
  id: number;
  taken_at?: string | null;
}

export interface Memory<T> {
  photo: T;
  yearsAgo: number;
  exact: boolean;
}

export interface SeoulDay {
  year: number;
  month: number;
  day: number;
}

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

// 윤년(2000년) 달력 위의 날짜 번호 — 2월 29일도 자리를 갖는다.
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
    // 원형 거리: 12월 30일 사진은 1월 1일에서 사흘 "앞"이다.
    let offset = dayIndex(parts.month, parts.day) - todayIndex;
    if (offset > DAYS / 2) offset -= DAYS;
    if (offset < -DAYS / 2) offset += DAYS;
    const distance = Math.abs(offset);
    if (distance > window) continue;
    // 몇 년 전인지는 가장 가까운 기념일의 연도로 센다.
    const anniversaryYear = today.year + (todayIndex + offset < 0 ? -1 : todayIndex + offset >= DAYS ? 1 : 0);
    const yearsAgo = anniversaryYear - parts.year;
    if (yearsAgo < 1) continue;
    candidates.push({ photo, yearsAgo, exact: distance === 0, distance, time: parts.time });
  }

  const exact = candidates.some(c => c.exact);
  const pool = exact ? candidates.filter(c => c.exact) : candidates;

  // 한 해가 섹션을 독차지하지 않게 연도별로 번갈아 고른다.
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
