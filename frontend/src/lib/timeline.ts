// `taken_at`은 벽시계 시각을 UTC 자리에 둔 값이라 연·월·일은 UTC로 읽는다. 촬영일이 없으면 달을 지어내지 않는다.
export interface TimelineSource {
  id: number;
  year?: number | null;
  taken_at?: string | null;
}

export interface TimelineMonth<T> {
  key: string;
  month: number | null;
  label: string;
  photos: T[];
}

export interface TimelineYear<T> {
  year: number | null;
  label: string;
  /** 숫자로 시작하는 id를 피한다(`#y2025`). */
  anchor: string;
  count: number;
  months: TimelineMonth<T>[];
}

export const UNKNOWN_DATE_LABEL = '날짜 미상';
export const UNKNOWN_YEAR_LABEL = '연도 미상';

export function takenParts(takenAt: string | null | undefined): { year: number; month: number; day: number; time: number } | null {
  if (!takenAt) return null;
  const date = new Date(takenAt);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), time };
}

export function monthDayLabel(takenAt: string | null | undefined): string | null {
  const parts = takenParts(takenAt);
  return parts ? `${parts.month}월 ${parts.day}일` : null;
}

function validYear(year: number | null | undefined): number | null {
  return typeof year === 'number' && Number.isInteger(year) && year > 0 ? year : null;
}

export function groupTimeline<T extends TimelineSource>(photos: readonly T[]): TimelineYear<T>[] {
  // 달 0은 "날짜 미상" 자리표시다.
  const years = new Map<number | null, Map<number, Array<{ photo: T; time: number | null }>>>();

  for (const photo of photos) {
    const parts = takenParts(photo.taken_at);
    const year = parts ? parts.year : validYear(photo.year);
    const month = parts ? parts.month : 0;
    let months = years.get(year);
    if (!months) years.set(year, (months = new Map()));
    let bucket = months.get(month);
    if (!bucket) months.set(month, (bucket = []));
    bucket.push({ photo, time: parts?.time ?? null });
  }

  return [...years.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, months]) => {
      const yearLabel = year === null ? UNKNOWN_YEAR_LABEL : String(year);
      const monthGroups = [...months.entries()]
        .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : b - a))
        .map(([month, items]): TimelineMonth<T> => ({
          key: `${year ?? 'unknown'}-${month === 0 ? 'unknown' : String(month).padStart(2, '0')}`,
          month: month === 0 ? null : month,
          label: month === 0 ? UNKNOWN_DATE_LABEL : year === null ? `${month}월` : `${year}년 ${month}월`,
          photos: items
            .sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || b.photo.id - a.photo.id)
            .map(item => item.photo),
        }));
      return {
        year,
        label: yearLabel,
        anchor: year === null ? 'y-unknown' : `y${year}`,
        count: monthGroups.reduce((sum, m) => sum + m.photos.length, 0),
        months: monthGroups,
      };
    });
}
