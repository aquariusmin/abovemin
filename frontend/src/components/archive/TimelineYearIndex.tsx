"use client";

import { useEffect, useRef, useState } from 'react';

interface YearEntry {
  anchor: string;
  label: string;
  count: number;
}

/**
 * 타임라인의 연도 색인. 화면 위에 붙어 있고, 지금 읽고 있는 해가 forest로 뒤집힌다.
 *
 * 링크 자체는 평범한 `#y2025` 앵커라 JS 없이도 이동한다. 이 컴포넌트가 더하는
 * 것은 "지금 어느 해인가" 표시와, 폰에서 가로로 넘치는 색인을 그 해가 보이게
 * 옮겨 주는 것뿐이다.
 */
export default function TimelineYearIndex({ years }: { years: YearEntry[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const sections = years
      .map(year => document.getElementById(year.anchor))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    // 화면 위쪽 1/3 띠에 걸친 섹션 중 가장 위의 것이 "지금 읽는 해"다. 해 하나가
    // 화면보다 길어도(2025년은 100장이 넘는다) 띠 안에 있는 동안 계속 그 해다.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = years.find(year => visible.has(year.anchor));
        if (first) setCurrent(first.anchor);
        // 띠에 아무 해도 없고 첫 해가 아직 띠 아래에 있으면 머리말을 읽는 중이다 —
        // 맨 아래까지 갔다가 돌아왔을 때 마지막 해가 켜진 채 남지 않게.
        else if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.2) setCurrent(null);
      },
      { rootMargin: '-20% 0px -66% 0px' },
    );
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [years]);

  // 폰에서 색인이 가로로 넘칠 때, 지금 해의 pill이 보이게 목록만 옆으로 민다.
  // `scrollIntoView`는 페이지 전체를 세로로도 움직여서 쓰지 않는다.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // 명시한 `behavior: 'smooth'`는 전역 움직임 줄이기 규칙(CSS)이 막지 못한다.
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    // 머리말로 돌아오면 색인도 처음으로.
    if (!current) {
      list.scrollTo({ left: 0, behavior });
      return;
    }
    const pill = list.querySelector<HTMLElement>(`[data-anchor="${current}"]`);
    if (!pill) return;
    const left = pill.offsetLeft - list.clientWidth / 2 + pill.clientWidth / 2;
    list.scrollTo({ left, behavior });
  }, [current]);

  return (
    <ol ref={listRef} className="flex gap-2 overflow-x-auto py-3 px-5 sm:px-6 md:px-10 scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => (
        <li key={year.anchor} className="shrink-0">
          <a
            href={`#${year.anchor}`}
            data-anchor={year.anchor}
            data-active={current === year.anchor}
            aria-current={current === year.anchor ? 'location' : undefined}
            className="btn-outline gap-1.5 px-3.5 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {year.label}
            <span className={current === year.anchor ? 'text-primary-foreground/70' : 'text-muted-foreground'}>{year.count}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
