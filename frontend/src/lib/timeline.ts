/**
 * `/archive/timeline`의 묶음: 연도 → 달 → 사진, 최신이 위.
 *
 * 앨범은 여행 단위라 "2025년 여름에 뭘 찍었지"에는 답하지 못한다. 촬영일
 * (`taken_at`)이 293장 중 281장에 있으므로, 새로 입력할 것 없이 시간 축으로
 * 다시 늘어놓을 수 있다.
 *
 * `taken_at`은 카메라의 벽시계 시각을 UTC 자리에 적어 둔 값이다(`takenDate`의
 * 주석). 그래서 연·월·일은 **UTC로** 읽는다 — 보는 사람의 시간대로 바꾸면
 * 12월 31일 밤 사진이 다음 해로 넘어간다.
 *
 * 촬영일이 없는 사진은 사람이 넣은 `year`만 믿을 수 있다. 그 해 안의 "날짜
 * 미상"에 모은다 — 달을 지어내지 않는다. `year`까지 없으면 맨 끝 "연도 미상".
 */

export interface TimelineSource {
  id: number;
  year?: number | null;
  taken_at?: string | null;
}

export interface TimelineMonth<T> {
  /** 앵커와 React key에 쓴다. `2025-08`, 날짜 미상은 `2025-unknown`. */
  key: string;
  /** 1–12. 날짜 미상이면 null. */
  month: number | null;
  /** "2025년 8월" / "날짜 미상". */
  label: string;
  photos: T[];
}

export interface TimelineYear<T> {
  /** 연도를 모르면 null — 목록 맨 끝에 한 번만 나온다. */
  year: number | null;
  /** 연도 색인과 제목에 쓰는 문자열. */
  label: string;
  /** 페이지 안 앵커(`#y2025`). 숫자로 시작하는 id를 피한다. */
  anchor: string;
  count: number;
  months: TimelineMonth<T>[];
}

export const UNKNOWN_DATE_LABEL = '날짜 미상';
export const UNKNOWN_YEAR_LABEL = '연도 미상';

/** `taken_at` → UTC 연·월·일. 읽을 수 없으면 null. */
export function takenParts(takenAt: string | null | undefined): { year: number; month: number; day: number; time: number } | null {
  if (!takenAt) return null;
  const date = new Date(takenAt);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), time };
}

/** "9월 19일". 촬영일이 없으면 null. */
export function monthDayLabel(takenAt: string | null | undefined): string | null {
  const parts = takenParts(takenAt);
  return parts ? `${parts.month}월 ${parts.day}일` : null;
}

function validYear(year: number | null | undefined): number | null {
  return typeof year === 'number' && Number.isInteger(year) && year > 0 ? year : null;
}

export function groupTimeline<T extends TimelineSource>(photos: readonly T[]): TimelineYear<T>[] {
  // 연도 → (달 또는 0=날짜 미상) → 사진. 달 0은 "미상" 자리표시다.
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
    // 최신 연도가 위, 연도 미상은 맨 끝.
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, months]) => {
      const yearLabel = year === null ? UNKNOWN_YEAR_LABEL : String(year);
      const monthGroups = [...months.entries()]
        // 12월 → 1월, 날짜 미상(0)은 그 해의 끝.
        .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : b - a))
        .map(([month, items]): TimelineMonth<T> => ({
          key: `${year ?? 'unknown'}-${month === 0 ? 'unknown' : String(month).padStart(2, '0')}`,
          month: month === 0 ? null : month,
          label: month === 0 ? UNKNOWN_DATE_LABEL : year === null ? `${month}월` : `${year}년 ${month}월`,
          photos: items
            // 달 안에서도 최신이 위. 시각이 같으면(연사) 나중에 올라온 것이 위.
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
