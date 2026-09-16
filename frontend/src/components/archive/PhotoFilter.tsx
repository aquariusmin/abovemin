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

  // 조건을 바꾸면 처음부터 다시 센다.
  function narrow(next: () => void) {
    next();
    setLimit(PAGE);
  }

  const selectClass =
    'appearance-none bg-transparent pr-6 text-sm font-medium text-ink cursor-pointer rounded-sm ' +
    'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-hairline py-4">
        <label className="flex items-center gap-2">
          <span className="label-ko text-muted-foreground">연도</span>
          <select value={year} onChange={e => narrow(() => setYear(e.target.value))} className={selectClass} aria-label="연도로 거르기">
            <option value={ALL}>전체</option>
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="label-ko text-muted-foreground">장소</span>
          <select value={place} onChange={e => narrow(() => setPlace(e.target.value))} className={selectClass} aria-label="장소로 거르기">
            <option value={ALL}>전체</option>
            {places.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <p className="eyebrow text-muted-foreground ml-auto" aria-live="polite">
          {active ? `${filtered.length}장` : `${photos.length}장 전체`}
        </p>

        {active && (
          <button
            type="button"
            onClick={() => narrow(() => { setYear(ALL); setPlace(ALL); })}
            className="eyebrow text-slate hover:text-ink transition-colors rounded-sm px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            초기화
          </button>
        )}
      </div>

      {!active ? (
        // 조건을 고르기 전에는 아무것도 그리지 않는다. 이 섹션의 목적은
        // 좁히는 것이고, 좁히지 않은 상태의 "전체"는 바로 위 컬렉션 그리드가
        // 이미 더 나은 방식으로 보여 주고 있다.
        <p className="py-16 text-center text-sm text-muted-foreground border border-dashed border-hairline rounded-lg break-keep">
          연도나 장소를 고르면 사진 {photos.length}장 중에서 찾아 보여 드립니다.
        </p>
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
                className="btn-outline text-[11px] uppercase tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                더 보기 ({filtered.length - shown.length}장 남음)
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="py-20 text-center text-sm text-muted-foreground border border-dashed border-hairline rounded-lg">
          조건에 맞는 사진이 없습니다.
        </p>
      )}
    </div>
  );
}
