"use client";

import { useMemo, useState } from 'react';
import PhotoGrid from '@/components/PhotoGrid';
import { cleanCaptionField } from '@/lib/caption';

/**
 * 아카이브 전체를 연도·장소로 좁혀 본다.
 *
 * 290장이 다섯 앨범에 흩어져 있는데 앨범 단위 순회만 가능했다. 두 값 모두
 * 이미 모든 사진에 붙어 있으므로, 새로 입력할 것 없이 질문만 바꾸면 된다 —
 * "2019년", "Seoul".
 *
 * 검색창을 두지 않은 이유: 제목이 파일명에서 자동 생성된 것이 많아 검색어로
 * 쓸 만한 문자열이 아니다. 연도와 장소는 사람이 확인하고 넣은 값이라 목록으로
 * 제시하는 편이 정직하고, 무엇이 있는지도 같이 알려 준다.
 */
type Photo = {
  id: number;
  src: string;
  title: string;
  location: string;
  year: number;
  album_slug: string;
  album_title: string;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  iso?: number | null;
};

const ALL = '__all__';

/**
 * 한 번에 그리는 최대 장수.
 *
 * 상한이 없을 때 이 섹션은 사진 290장을 한 화면에 올렸고, `/archive`가
 * 0.9 MB에서 **4.5 MB**로, HTML만 40 KB에서 1.3 MB로 커졌다(측정). CSS
 * columns 안에서는 `loading="lazy"`도 별 도움이 안 된다 — 브라우저가 뷰포트
 * 근처로 판단하는 이미지가 너무 많아 90장이 즉시 내려왔다. 폰트에서 아낀
 * 것을 이 한 섹션이 되돌려 놓는 셈이다.
 */
const PAGE = 48;

/**
 * 조건을 고르기 전에 보여 줄 최근 사진 장수.
 *
 * 예전에는 이 자리가 점선 상자 하나였다("연도나 장소를 고르면…"). 섹션의
 * 절반이 안내문뿐이라 기능이 있다는 것조차 잘 보이지 않았다. 최근 올라온
 * 사진을 한 화면 분량만 보여 주면, 아래 그리드가 무엇을 거르는지 먼저
 * 보이고 위의 칩이 그것을 좁히는 도구로 읽힌다. 전체 290장이 아니라 12장인
 * 이유는 PAGE 주석의 무게 문제와 같다.
 */
const PREVIEW = 12;

export default function PhotoFilter({ photos }: { photos: Photo[] }) {
  const [year, setYear] = useState<string>(ALL);
  const [place, setPlace] = useState<string>(ALL);
  const [limit, setLimit] = useState(PAGE);

  // 목록은 데이터에서 만든다. 비어 있는 값은 선택지로 두지 않는다.
  const years = useMemo(
    () => [...new Set(photos.map(p => p.year).filter(Boolean))].sort((a, b) => b - a),
    [photos],
  );
  const places = useMemo(
    // "-"도 빈 값이다 — 선택지에 "-"가 뜨면 고를 수 있는 장소처럼 보인다.
    () =>
      [...new Set(photos.map(p => cleanCaptionField(p.location)).filter((v): v is string => v !== null))]
        .sort((a, b) => a.localeCompare(b)),
    [photos],
  );

  const filtered = useMemo(
    () =>
      photos.filter(
        p =>
          (year === ALL || String(p.year) === year) &&
          (place === ALL || p.location?.trim() === place),
      ),
    [photos, year, place],
  );

  const active = year !== ALL || place !== ALL;
  const shown = filtered.slice(0, limit);

  // "최근"은 id 순서다 — 홈의 최근 아카이브 띠와 같은 기준.
  const recent = useMemo(
    () => photos.toSorted((a, b) => b.id - a.id).slice(0, PREVIEW),
    [photos],
  );

  // 조건을 바꾸면 처음부터 다시 센다.
  function narrow(next: () => void) {
    next();
    setLimit(PAGE);
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* 필터 패널. 연도는 열 개 남짓이라 전부 칩으로 펼친다 — 무엇이 있는지가
          곧 정보다. 장소는 36곳이라 칩으로 펼치면 패널이 사진보다 길어지므로,
          같은 pill 모양의 select로 접는다. */}
      <div className="mb-8 md:mb-10 space-y-5 border-y border-hairline py-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
          <span className="label-ko text-muted-foreground sm:w-10 sm:pt-2.5 shrink-0" id="filter-year-label">연도</span>
          <div role="group" aria-labelledby="filter-year-label" className="flex flex-wrap gap-2">
            {[ALL, ...years.map(String)].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => narrow(() => setYear(y))}
                data-active={year === y}
                aria-pressed={year === y}
                className="btn-outline tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {y === ALL ? '전체' : y}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <label htmlFor="filter-place" className="label-ko text-muted-foreground sm:w-10 shrink-0">장소</label>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="relative inline-flex items-center">
              <select
                id="filter-place"
                value={place}
                onChange={e => narrow(() => setPlace(e.target.value))}
                data-active={place !== ALL}
                className="btn-outline appearance-none cursor-pointer pr-10 max-w-[70vw] truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <option value={ALL}>전체 장소</option>
                {places.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <svg
                aria-hidden
                viewBox="0 0 12 12"
                className={`pointer-events-none absolute right-4 h-3 w-3 ${place !== ALL ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            {active && (
              <button
                type="button"
                onClick={() => narrow(() => { setYear(ALL); setPlace(ALL); })}
                className="btn-ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                조건 초기화
              </button>
            )}
          </div>
        </div>

        {/* 결과 수는 본문 글씨로. 한국어에 모노 대문자 자간을 걸면 글자가
            흩어져 숫자가 읽히지 않았다. */}
        <p className="text-sm text-slate" aria-live="polite">
          {active
            ? <>전체 {photos.length}장 중 <span className="font-medium text-ink tabular-nums">{filtered.length}장</span></>
            : <>최근 올라온 {recent.length}장을 보여 드립니다. 연도나 장소를 고르면 전체 {photos.length}장에서 찾습니다.</>}
        </p>
      </div>

      {!active ? (
        // 조건을 고르기 전: 최근 사진 한 화면 분량. 컬렉션 전체는 바로 위
        // 그리드가 이미 더 나은 방식으로 보여 주고 있다.
        <PhotoGrid key="recent" photos={recent} />
      ) : filtered.length > 0 ? (
        <>
          {/* 조건이 바뀌면 그리드를 새로 만든다. 재사용하면 사진이 자리만
              바뀌면서 스크롤 리빌 애니메이션이 어긋난다. */}
          <PhotoGrid key={`${year}-${place}`} photos={shown} />
          {filtered.length > shown.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setLimit(n => n + PAGE)}
                className="btn-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                더 보기 ({filtered.length - shown.length}장 남음)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center space-y-4">
          <p className="text-base text-slate">조건에 맞는 사진이 없습니다.</p>
          <button
            type="button"
            onClick={() => narrow(() => { setYear(ALL); setPlace(ALL); })}
            className="btn-outline"
          >
            조건 초기화
          </button>
        </div>
      )}
    </div>
  );
}
